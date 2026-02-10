import { describe, expect, it } from 'vitest';
import { nextHintIndex } from '@/lib/domain/hints';
import { calculateScore } from '@/lib/domain/scoring';

describe('hint ordering and penalty', () => {
  it('returns next hint index in order', () => {
    expect(nextHintIndex(0, 3)).toBe(0);
    expect(nextHintIndex(1, 3)).toBe(1);
    expect(nextHintIndex(2, 3)).toBe(2);
    expect(nextHintIndex(3, 3)).toBeNull();
  });

  it('applies hint penalty to score', () => {
    const noHint = calculateScore('WIN', 2, 60000, 0, false);
    const withHint = calculateScore('WIN', 2, 60000, 60, false);
    expect(withHint).toBeLessThan(noHint);
  });
});
