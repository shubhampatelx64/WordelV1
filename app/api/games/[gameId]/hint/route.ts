import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { requireUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { takeRateLimit } from '@/lib/server/rate-limit';
import { NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/server/security';
import { nextHintIndex } from '@/lib/domain/hints';

const schema = z.object({});

export async function POST(req: NextRequest, { params }: { params: { gameId: string } }) {
  if (!assertSameOrigin(req)) return fail('CSRF_FORBIDDEN', 'Invalid origin', 403);
  const user = await requireUser();
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);
  const ip = req.headers.get('x-forwarded-for') ?? user.id;
  if (!takeRateLimit(`hint:${ip}`, 10, 60_000)) return fail('RATE_LIMITED', 'Too many hint requests', 429);

  const parsed = schema.safeParse({});
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid request', 400, parsed.error.flatten());

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const gameplay = await tx.gamePlay.findUnique({
      where: { gameId_userId: { gameId: params.gameId, userId: user.id } },
      include: {
        hintUses: { include: { hint: true }, orderBy: { usedAt: 'asc' } },
        game: { include: { answerWord: { include: { hints: { orderBy: { order: 'asc' } } } } } }
      }
    });
    if (!gameplay) return fail('NOT_FOUND', 'Start game before requesting hints', 404);
    if (gameplay.status !== 'IN_PROGRESS') return fail('GAME_ALREADY_COMPLETE', 'Game already complete', 409);

    const hints = gameplay.game.answerWord.hints;
    const idx = nextHintIndex(gameplay.hintUses.length, hints.length);
    if (idx === null) return fail('NO_HINTS_LEFT', 'No hints remaining', 409);
    const hint = hints[idx];
    await tx.hintUse.create({ data: { gamePlayId: gameplay.id, hintId: hint.id } });
    const penalty = gameplay.hintUses.reduce((s, h) => s + h.hint.cost, 0) + hint.cost;
    await tx.gamePlay.update({ where: { id: gameplay.id }, data: { hintsUsed: gameplay.hintUses.length + 1, hintPenalty: penalty } });

    return ok({
      hint: { id: hint.id, type: hint.type, content: hint.content, cost: hint.cost, order: hint.order },
      hintsUsed: gameplay.hintUses.length + 1,
      remaining: hints.length - (gameplay.hintUses.length + 1),
      totalPenalty: penalty
    });
  }, { isolationLevel: 'Serializable' });
}
