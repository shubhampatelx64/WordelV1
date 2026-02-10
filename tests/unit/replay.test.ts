import { describe, expect, it } from 'vitest';
import { canStartDaily } from '@/lib/domain/replay';

describe('replay prevention', () => {
  it('allows creating first gameplay', () => {
    expect(canStartDaily(null)).toEqual({ allowed: true, resumed: false });
  });

  it('resumes in-progress gameplay', () => {
    expect(canStartDaily({ status: 'IN_PROGRESS' })).toEqual({ allowed: true, resumed: true });
  });

  it('blocks second completed gameplay', () => {
    const result = canStartDaily({ status: 'WIN' });
    expect(result.allowed).toBe(false);
  });
});
