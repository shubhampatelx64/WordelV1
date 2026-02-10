import { describe, expect, it } from 'vitest';
import { evaluateGuess, patternString } from '@/lib/domain/evaluate';

describe('evaluateGuess duplicate handling', () => {
  it('marks full match as green', () => {
    expect(patternString(evaluateGuess('APPLE', 'APPLE'))).toBe('GGGGG');
  });

  it('handles duplicate in guess beyond answer count', () => {
    expect(patternString(evaluateGuess('APPLE', 'ALLEY'))).toBe('GYBYB');
  });

  it('handles duplicate in answer', () => {
    expect(patternString(evaluateGuess('LEVEL', 'HELLO'))).toBe('BGYYB');
  });

  it('gives yellows after greens pass', () => {
    expect(patternString(evaluateGuess('BANAL', 'LLAMA'))).toBe('YBYBY');
  });

  it('does not over allocate yellows', () => {
    expect(patternString(evaluateGuess('ROTOR', 'ERROR'))).toBe('BYBGG');
  });

  it('mixed duplicate case', () => {
    expect(patternString(evaluateGuess('EERIE', 'REFER'))).toBe('YGBYB');
  });
});
