export type LeaderboardComparable = {
  score: number;
  attemptsUsed: number;
  timeMs: number;
  createdAt: Date;
};

export function sortLeaderboard<T extends LeaderboardComparable>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.attemptsUsed !== b.attemptsUsed) return a.attemptsUsed - b.attemptsUsed;
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
