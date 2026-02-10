import { describe, expect, it } from 'vitest';
import { canStartSharedGame } from '@/lib/domain/custom';

describe('custom shareCode routing and start checks', () => {
  it('allows active unbounded game', () => {
    expect(canStartSharedGame({ isActive: true, startAt: null, endAt: null }).allowed).toBe(true);
  });

  it('blocks future-start game', () => {
    const future = new Date(Date.now() + 100000);
    expect(canStartSharedGame({ isActive: true, startAt: future, endAt: null }).allowed).toBe(false);
  });
});
