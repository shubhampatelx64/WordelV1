import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { requireUser } from '@/lib/server/auth';
import { ensureRole } from '@/lib/server/permissions';
import { audit } from '@/lib/server/audit';
import { generateShareCode } from '@/lib/server/share-code';

const createSchema = z.object({ answerWordId: z.string(), length: z.number().min(4).max(10), maxAttempts: z.number().int().min(1).max(12), hardModeAllowed: z.boolean().default(true), dictionaryMode: z.enum(['STRICT', 'RELAXED']).default('STRICT'), difficulty: z.string().default('medium'), startAt: z.string().datetime().optional(), endAt: z.string().datetime().optional(), allowReplay: z.boolean().default(false) });
const updateSchema = createSchema.partial().extend({ id: z.string(), isActive: z.boolean().optional() });

export async function GET() {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN', 'CREATOR']);
  if (deny) return deny;
  const where = user!.role === 'ADMIN' ? {} : { creatorUserId: user!.id };
  const games = await prisma.game.findMany({ where: { ...where, mode: 'CUSTOM' }, orderBy: { createdAt: 'desc' } as any });
  return ok(games);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN', 'CREATOR']);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid custom game payload', 400, parsed.error.flatten());

  let shareCode = generateShareCode();
  for (let i = 0; i < 4; i += 1) {
    const exists = await prisma.game.findUnique({ where: { shareCode } });
    if (!exists) break;
    shareCode = generateShareCode();
  }

  const game = await prisma.game.create({
    data: {
      mode: 'CUSTOM',
      creatorUserId: user!.id,
      shareCode,
      answerWordId: parsed.data.answerWordId,
      length: parsed.data.length,
      maxAttempts: parsed.data.maxAttempts,
      hardModeAllowed: parsed.data.hardModeAllowed,
      dictionaryMode: parsed.data.dictionaryMode,
      difficulty: parsed.data.difficulty,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      allowReplay: parsed.data.allowReplay,
      isActive: true
    }
  });

  await audit(user!.id, 'CUSTOM_GAME_CREATE', 'GAME', game.id, { shareCode: game.shareCode });
  return ok({ gameId: game.id, shareCode: game.shareCode }, 201);
}

export async function PUT(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN', 'CREATOR']);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid update payload', 400, parsed.error.flatten());

  const existing = await prisma.game.findUnique({ where: { id: parsed.data.id } });
  if (!existing || existing.mode !== 'CUSTOM') return fail('NOT_FOUND', 'Custom game not found', 404);
  if (user!.role !== 'ADMIN' && existing.creatorUserId !== user!.id) return fail('FORBIDDEN', 'Can only manage your own custom games', 403);

  const game = await prisma.game.update({
    where: { id: parsed.data.id },
    data: {
      answerWordId: parsed.data.answerWordId,
      length: parsed.data.length,
      maxAttempts: parsed.data.maxAttempts,
      hardModeAllowed: parsed.data.hardModeAllowed,
      dictionaryMode: parsed.data.dictionaryMode,
      difficulty: parsed.data.difficulty,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined,
      allowReplay: parsed.data.allowReplay,
      isActive: parsed.data.isActive
    }
  });
  await audit(user!.id, 'CUSTOM_GAME_UPDATE', 'GAME', game.id, parsed.data);
  return ok(game);
}
