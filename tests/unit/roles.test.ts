import { describe, expect, it } from 'vitest';
import { ensureRole } from '@/lib/server/permissions';

describe('role checks for admin endpoints', () => {
  it('rejects missing user', () => {
    const res = ensureRole(null, ['ADMIN']);
    expect(res?.status).toBe(401);
  });

  it('rejects non-admin', () => {
    const res = ensureRole({ role: 'USER' }, ['ADMIN']);
    expect(res?.status).toBe(403);
  });

  it('accepts admin', () => {
    const res = ensureRole({ role: 'ADMIN' }, ['ADMIN']);
    expect(res).toBeNull();
  });
});
