import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ shareCode: z.string().min(6).max(10) });

export async function GET(_: Request, { params }: { params: { shareCode: string } }) {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid share code', 400, parsed.error.flatten());

  const game = await prisma.game.findUnique({
    where: { shareCode: parsed.data.shareCode },
    select: {
      id: true,
      mode: true,
      length: true,
      maxAttempts: true,
      hardModeAllowed: true,
      dictionaryMode: true,
      difficulty: true,
      shareCode: true,
      startAt: true,
      endAt: true,
      isActive: true
    }
  });

  if (!game || !game.isActive) return fail('NOT_FOUND', 'Game not found', 404);
  return ok(game);
}
