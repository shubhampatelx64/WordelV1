import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { requireUser } from '@/lib/server/auth';
import { parseJson } from '@/lib/server/validation';
import { NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/server/security';

const bodySchema = z.object({ hardMode: z.boolean().optional() });

export async function POST(req: NextRequest, { params }: { params: { gameId: string } }) {
  if (!assertSameOrigin(req)) return fail('CSRF_FORBIDDEN', 'Invalid origin', 403);
  const user = await requireUser();
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);

  const parsed = await parseJson(req, bodySchema);
  if (parsed.error) return parsed.error;
  const hardMode = !!parsed.data.hardMode;

  const game = await prisma.game.findUnique({ where: { id: params.gameId } });
  if (!game || !game.isActive) return fail('NOT_FOUND', 'Game not found', 404);

  const existing = await prisma.gamePlay.findUnique({ where: { gameId_userId: { gameId: game.id, userId: user.id } } });
  if (existing) {
    if (existing.status !== 'IN_PROGRESS') {
      return fail('REPLAY_FORBIDDEN', 'Daily game already completed', 409);
    }
    return ok({ gameplayId: existing.id, status: existing.status, resumed: true });
  }

  const created = await prisma.gamePlay.create({
    data: { gameId: game.id, userId: user.id, hardMode: hardMode && game.hardModeAllowed },
    select: { id: true, status: true }
  });

  return ok({ gameplayId: created.id, status: created.status, resumed: false }, 201);
}
