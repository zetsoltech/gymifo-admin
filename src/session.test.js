import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDashboardOverview,
  getSignupsTrend,
  getPaidVsFree,
  getRevenue,
  describeNetworkFailure,
  NETWORK_ERROR,
  REQUEST_FAILED,
  SERVER_ERROR,
  SESSION_EXPIRED,
} from './api.ts';

// The dashboard fires these four in parallel — the exact fan-out that made the
// original bug show four toasts at once.
const DASHBOARD_CALLS = [getDashboardOverview, getSignupsTrend, getPaidVsFree, getRevenue];

let store;

beforeEach(() => {
  store = new Map([
    ['gymifo_token', 'stale-access'],
    ['gymifo_refresh_token', 'stored-refresh'],
  ]);
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = { dispatchEvent: vi.fn() };
});

afterEach(() => vi.restoreAllMocks());

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

const unauthorized = () => json(401, { statusCode: 401, message: 'Please sign in to continue.' });

function refreshCalls() {
  return globalThis.fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'));
}

describe('401 handling', () => {
  it('four parallel 401s share ONE refresh, then all retry successfully', async () => {
    globalThis.fetch = vi.fn(async (url, options) => {
      if (url.endsWith('/auth/refresh')) {
        expect(JSON.parse(options.body)).toEqual({ refreshToken: 'stored-refresh' });
        return json(200, { access_token: 'fresh-access', refresh_token: 'rotated-refresh' });
      }
      const auth = options.headers.get('Authorization');
      return auth === 'Bearer fresh-access' ? json(200, { value: 1 }) : unauthorized();
    });

    const results = await Promise.all(DASHBOARD_CALLS.map((call) => call('monthly')));

    // The backend revokes every other session each time it issues a pair, so a
    // second concurrent refresh would invalidate the first one's tokens.
    expect(refreshCalls()).toHaveLength(1);
    expect(results).toEqual([{ value: 1 }, { value: 1 }, { value: 1 }, { value: 1 }]);
    expect(store.get('gymifo_token')).toBe('fresh-access');
    expect(store.get('gymifo_refresh_token')).toBe('rotated-refresh');
  });

  it('refresh rejected (signed in elsewhere) → SESSION_EXPIRED, tokens cleared, no retry loop', async () => {
    globalThis.fetch = vi.fn(async (url) =>
      url.endsWith('/auth/refresh') ? json(401, { message: 'INVALID_REFRESH_TOKEN' }) : unauthorized(),
    );

    const error = await getDashboardOverview('monthly').catch((err) => err);

    expect(error.code).toBe('SESSION_EXPIRED');
    expect(store.has('gymifo_token')).toBe(false);
    expect(store.has('gymifo_refresh_token')).toBe(false);
    expect(globalThis.window.dispatchEvent).toHaveBeenCalled();
    // One data call + one refresh — the failed refresh must not re-enter request().
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('refresh succeeds but the retry still 401s → modal, not a mystery toast', async () => {
    globalThis.fetch = vi.fn(async (url) =>
      url.endsWith('/auth/refresh')
        ? json(200, { access_token: 'fresh-access' })
        : unauthorized(),
    );

    const error = await getDashboardOverview('monthly').catch((err) => err);

    expect(error.code).toBe('SESSION_EXPIRED');
    // Original call, refresh, one retry — and then it stops.
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('a 401 from login is a wrong password, not an expired session', async () => {
    const { login } = await import('./api.ts');
    globalThis.fetch = vi.fn(async () => json(401, { message: 'INVALID_EMAIL_OR_PASSWORD' }));

    const error = await login('admin@gymifo.com', 'wrong').catch((err) => err);

    expect(error.code).toBe(REQUEST_FAILED);
    expect(error.code).not.toBe(SESSION_EXPIRED);
    expect(error.status).toBe(401);
    expect(error.message).toBe('INVALID_EMAIL_OR_PASSWORD');
    expect(refreshCalls()).toHaveLength(0);
  });
});

describe('failure causes are distinguishable', () => {
  // What the browser actually throws when it cannot open a connection at all:
  // DNS, TCP, TLS, or a blocked preflight all surface as this bare TypeError.
  const offline = () => vi.fn(async () => {
    throw new TypeError('Failed to fetch');
  });

  it('an unreachable server reads as a network failure, not "Failed to fetch"', async () => {
    globalThis.fetch = offline();

    const error = await getDashboardOverview('monthly').catch((err) => err);

    expect(error.code).toBe(NETWORK_ERROR);
    expect(error.message).not.toBe('Failed to fetch');
  });

  it('a dead network during refresh does NOT sign the admin out', async () => {
    // A 401 sends it to refresh, and the network dies there. Reporting an
    // expired session would discard a perfectly good login over a blip.
    globalThis.fetch = vi.fn(async (url) => {
      if (url.endsWith('/auth/refresh')) throw new TypeError('Failed to fetch');
      return unauthorized();
    });

    const error = await getDashboardOverview('monthly').catch((err) => err);

    expect(error.code).toBe(NETWORK_ERROR);
    expect(store.get('gymifo_token')).toBe('stale-access');
    expect(store.get('gymifo_refresh_token')).toBe('stored-refresh');
    expect(globalThis.window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('a gateway 502 with no JSON body keeps its status instead of "Request failed"', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    }));

    const error = await getDashboardOverview('monthly').catch((err) => err);

    expect(error.code).toBe(SERVER_ERROR);
    expect(error.status).toBe(502);
    expect(error.message).toContain('502');
  });

  it('login on an unreachable API explains the outage, not the password', async () => {
    const { login } = await import('./api.ts');
    globalThis.fetch = offline();

    const error = await login('admin@gymifo.com', 'correct-password').catch((err) => err);

    expect(error.code).toBe(NETWORK_ERROR);
    expect(error.message).not.toBe('Failed to fetch');
  });

  it('an http:// API URL is reported as the protocol bug it is, not "server down"', () => {
    // The real dev-mode failure: the API sends HSTS, so Chrome upgrades the
    // request to https, and a CORS preflight may not follow that redirect
    // ("PreflightDisallowedRedirect"). Blaming the server sends people off to
    // check a backend that is perfectly healthy.
    const message = describeNetworkFailure('http://api.gymifo.com', 'http:');

    expect(message).toContain('Set VITE_API_BASE_URL to https://');
    expect(message).toContain('preflight cannot follow that redirect');
    expect(message).not.toContain('may be unreachable');
  });

  it('an https page calling an http API is named as mixed content', () => {
    const message = describeNetworkFailure('http://api.gymifo.com', 'https:');

    expect(message).toContain('mixed content');
  });

  it('http://localhost is a valid dev target, not a protocol mistake', () => {
    const message = describeNetworkFailure('http://localhost:8000', 'http:');

    expect(message).not.toContain('Set VITE_API_BASE_URL');
    expect(message).toContain('never completed');
  });

  it('an https API that simply cannot be reached does not guess at a cause', () => {
    const message = describeNetworkFailure('https://api.gymifo.com', 'https:');

    expect(message).toContain('never completed');
    expect(message).toContain('CORS');
  });
});
