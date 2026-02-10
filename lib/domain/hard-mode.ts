export function validateHardMode(previousPatterns: string[], previousGuesses: string[], nextGuess: string): string | null {
  const requiredLetters = new Set<string>();
  const fixed = new Map<number, string>();

  previousPatterns.forEach((pattern, idx) => {
    const guess = previousGuesses[idx];
    for (let i = 0; i < pattern.length; i += 1) {
      if (pattern[i] === 'G') fixed.set(i, guess[i]);
      if (pattern[i] === 'Y' || pattern[i] === 'G') requiredLetters.add(guess[i]);
    }
  });

  for (const [idx, ch] of fixed.entries()) {
    if (nextGuess[idx] !== ch) return `Hard mode requires ${ch} at position ${idx + 1}`;
  }

  for (const ch of requiredLetters) {
    if (!nextGuess.includes(ch)) return `Hard mode requires letter ${ch}`;
  }

  return null;
}
