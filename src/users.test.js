import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUser, updateUser } from './api.ts';
import { isPasswordValid } from './components/UserFormModal.jsx';

// api.ts touches localStorage (getToken) and fetch. Stub both — real mode (no
// VITE_USE_MOCK_API) is the default here, so calls go through fetch.
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
  }));
});

afterEach(() => vi.restoreAllMocks());

// Pulls the [url, options] of the single fetch call and parses its JSON body.
function lastRequest() {
  const [url, options] = globalThis.fetch.mock.calls.at(-1);
  return { url, method: options.method, body: JSON.parse(options.body) };
}

describe('updateUser — sends only the fields given', () => {
  it('name-only edit (admin) hits PUT /admin/users/:id with just fullName', async () => {
    await updateUser('u1', { fullName: 'New Name' });
    const { url, method, body } = lastRequest();
    expect(method).toBe('PUT');
    expect(url).toMatch(/\/admin\/users\/u1$/);
    expect(body).toEqual({ fullName: 'New Name' });
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('role');
  });

  it('super-admin edit carries every provided field', async () => {
    await updateUser('u2', { fullName: 'John', password: 'ResetPass789', role: 'super-admin' });
    const { body } = lastRequest();
    expect(body).toEqual({ fullName: 'John', password: 'ResetPass789', role: 'super-admin' });
  });
});

describe('other user endpoints', () => {
  it('createUser POSTs the full payload to /admin/users', async () => {
    await createUser({ email: 'a@b.com', fullName: 'Jane', password: 'StrongPass123', role: 'admin' });
    const { url, method, body } = lastRequest();
    expect(method).toBe('POST');
    expect(url).toMatch(/\/admin\/users$/);
    expect(body).toEqual({ email: 'a@b.com', fullName: 'Jane', password: 'StrongPass123', role: 'admin' });
  });
});

describe('isPasswordValid — all four rules required', () => {
  it('accepts a password meeting every rule', () => {
    expect(isPasswordValid('StrongPass1!')).toBe(true);
  });

  it.each([
    ['too short', 'Sh0rt!'],
    ['no uppercase', 'weakpass1!'],
    ['no number', 'WeakPass!'],
    ['no special char', 'WeakPass123'],
  ])('rejects: %s', (_label, pw) => {
    expect(isPasswordValid(pw)).toBe(false);
  });
});
