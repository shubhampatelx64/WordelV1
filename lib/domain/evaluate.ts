export type LetterResult = 'G' | 'Y' | 'B';

export function evaluateGuess(answer: string, guess: string): LetterResult[] {
  const normalizedAnswer = answer.toUpperCase();
  const normalizedGuess = guess.toUpperCase();
  const result: LetterResult[] = Array(normalizedGuess.length).fill('B');
  const counts = new Map<string, number>();

  for (let i = 0; i < normalizedAnswer.length; i += 1) {
    const a = normalizedAnswer[i];
    if (normalizedGuess[i] === a) {
      result[i] = 'G';
    } else {
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
  }

  for (let i = 0; i < normalizedGuess.length; i += 1) {
    if (result[i] === 'G') continue;
    const letter = normalizedGuess[i];
    const remaining = counts.get(letter) ?? 0;
    if (remaining > 0) {
      result[i] = 'Y';
      counts.set(letter, remaining - 1);
    }
  }

  return result;
}

export function patternString(pattern: LetterResult[]): string {
  return pattern.join('');
}
