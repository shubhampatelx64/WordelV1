export function calculateScore(status: 'WIN' | 'LOSS', attemptsUsed: number, timeMs: number): number {
  if (status === 'LOSS') return 0;
  const cappedSeconds = Math.min(Math.floor(timeMs / 1000), 900);
  return Math.max(0, 1000 - attemptsUsed * 100 - cappedSeconds);
}
