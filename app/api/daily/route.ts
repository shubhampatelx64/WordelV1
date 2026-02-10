import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { fail, ok } from '@/lib/server/response';
import { getUTCDateKey } from '@/lib/server/date';

const querySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ date: searchParams.get('date') ?? undefined });
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid date format', 400, parsed.error.flatten());
  const dateKey = parsed.data.date ?? getUTCDateKey();
  const game = await prisma.game.findFirst({
    where: { dateKey, mode: 'DAILY', length: 5, isActive: true },
    select: { id: true, dateKey: true, mode: true, length: true, maxAttempts: true, hardModeAllowed: true }
  });
  if (!game) return fail('NOT_FOUND', 'No daily game found for date', 404);
  return ok(game);
}
