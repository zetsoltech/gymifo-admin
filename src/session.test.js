import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDashboardOverview, getSignupsTrend, getPaidVsFree, getRevenue } from './api.ts';

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

    expect(error.code).toBeUndefined();
    expect(error.message).toBe('INVALID_EMAIL_OR_PASSWORD');
    expect(refreshCalls()).toHaveLength(0);
  });
});
