export function calculateScore(
  status: 'WIN' | 'LOSS',
  attemptsUsed: number,
  timeMs: number,
  hintPenalty: number,
  hardMode: boolean
): number {
  if (status === 'LOSS') return 0;
  const timeSeconds = Math.floor(timeMs / 1000);
  const timePenalty = Math.floor(timeSeconds / 5) * 5;
  const hardModeBonus = hardMode ? 100 : 0;
  return Math.max(0, 1000 - attemptsUsed * 100 - timePenalty - hintPenalty + hardModeBonus);
}
