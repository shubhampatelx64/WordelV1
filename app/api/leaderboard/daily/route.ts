import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { fail, ok } from '@/lib/server/response';
import { getUTCDateKey } from '@/lib/server/date';

const querySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), limit: z.coerce.number().min(1).max(100).optional() });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ date: searchParams.get('date') ?? undefined, limit: searchParams.get('limit') ?? 20 });
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid query params', 400, parsed.error.flatten());

  const dateKey = parsed.data.date ?? getUTCDateKey();
  const game = await prisma.game.findFirst({ where: { dateKey, mode: 'DAILY', length: 5, isActive: true } });
  if (!game) return fail('NOT_FOUND', 'No daily game found', 404);

  const entries = await prisma.leaderboardEntry.findMany({
    where: { dateKey, gameId: game.id },
    orderBy: [{ score: 'desc' }, { attemptsUsed: 'asc' }, { timeMs: 'asc' }, { createdAt: 'asc' }],
    take: parsed.data.limit,
    include: { user: { select: { displayName: true } } }
  });

  return ok({
    dateKey,
    gameId: game.id,
    entries: entries.map((e, idx) => ({
      rank: idx + 1,
      displayName: e.user.displayName,
      score: e.score,
      attemptsUsed: e.attemptsUsed,
      timeMs: e.timeMs
    }))
  });
}
