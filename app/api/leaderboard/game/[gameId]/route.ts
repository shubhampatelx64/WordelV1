import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { z } from 'zod';

const schema = z.object({ gameId: z.string().min(1) });

export async function GET(_: Request, { params }: { params: { gameId: string } }) {
  const parsed = schema.safeParse(params);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid gameId', 400, parsed.error.flatten());

  const game = await prisma.game.findUnique({ where: { id: parsed.data.gameId } });
  if (!game) return fail('NOT_FOUND', 'Game not found', 404);

  const entries = await prisma.leaderboardEntry.findMany({
    where: { gameId: game.id },
    orderBy: [{ score: 'desc' }, { attemptsUsed: 'asc' }, { timeMs: 'asc' }, { createdAt: 'asc' }],
    include: { user: { select: { displayName: true } } }
  });

  return ok({ entries: entries.map((e, i) => ({ rank: i + 1, displayName: e.user.displayName, score: e.score, attemptsUsed: e.attemptsUsed, timeMs: e.timeMs, hintPenalty: e.hintPenalty })) });
}
