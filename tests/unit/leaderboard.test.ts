import { describe, expect, it } from 'vitest';
import { sortLeaderboard } from '@/lib/domain/leaderboard';

describe('leaderboard ordering', () => {
  it('orders by score desc then attempts asc then time asc then createdAt asc', () => {
    const entries = [
      { score: 800, attemptsUsed: 3, timeMs: 50000, createdAt: new Date('2025-01-01T00:01:00Z'), id: 'a' },
      { score: 900, attemptsUsed: 4, timeMs: 50000, createdAt: new Date('2025-01-01T00:01:00Z'), id: 'b' },
      { score: 900, attemptsUsed: 3, timeMs: 70000, createdAt: new Date('2025-01-01T00:01:00Z'), id: 'c' },
      { score: 900, attemptsUsed: 3, timeMs: 60000, createdAt: new Date('2025-01-01T00:00:00Z'), id: 'd' }
    ];

    expect(sortLeaderboard(entries).map((e) => e.id)).toEqual(['d', 'c', 'b', 'a']);
  });
});
