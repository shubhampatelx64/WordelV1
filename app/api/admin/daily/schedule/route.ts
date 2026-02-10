import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { requireUser } from '@/lib/server/auth';
import { ensureRole } from '@/lib/server/permissions';
import { audit } from '@/lib/server/audit';
import { getUTCDateKey } from '@/lib/server/date';

const assignSchema = z.object({ dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), wordId: z.string(), length: z.number().min(4).max(10), difficulty: z.string().default('medium'), hardModeAllowed: z.boolean().default(true) });
const autofillSchema = z.object({ days: z.number().int().min(1).max(30), length: z.number().min(4).max(10), difficulty: z.string().default('medium'), avoidLastDays: z.number().int().min(0).max(60).default(7) });

export async function POST(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN']);
  if (deny) return deny;

  const body = await req.json().catch(() => null);
  const type = body?.type;

  if (type === 'assign') {
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid assign payload', 400, parsed.error.flatten());
    const game = await prisma.game.upsert({
      where: { mode_dateKey_length_difficulty: { mode: 'DAILY', dateKey: parsed.data.dateKey, length: parsed.data.length, difficulty: parsed.data.difficulty } },
      update: { answerWordId: parsed.data.wordId, hardModeAllowed: parsed.data.hardModeAllowed, isActive: true, maxAttempts: 6 },
      create: { mode: 'DAILY', dateKey: parsed.data.dateKey, length: parsed.data.length, difficulty: parsed.data.difficulty, maxAttempts: 6, hardModeAllowed: parsed.data.hardModeAllowed, answerWordId: parsed.data.wordId, isActive: true }
    });
    await audit(user!.id, 'SCHEDULE_ASSIGN', 'GAME', game.id, parsed.data);
    return ok(game);
  }

  if (type === 'autofill') {
    const parsed = autofillSchema.safeParse(body);
    if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid autofill payload', 400, parsed.error.flatten());

    const used = await prisma.game.findMany({
      where: { mode: 'DAILY', length: parsed.data.length, difficulty: parsed.data.difficulty, dateKey: { gte: getUTCDateKey(new Date(Date.now() - parsed.data.avoidLastDays * 86400000)) } },
      select: { answerWordId: true }
    });
    const usedIds = new Set(used.map((g) => g.answerWordId));
    const pool = await prisma.word.findMany({ where: { length: parsed.data.length, difficulty: parsed.data.difficulty, isActive: true } });
    const candidates = pool.filter((w) => !usedIds.has(w.id));
    const created: string[] = [];
    for (let i = 0; i < parsed.data.days; i += 1) {
      const date = new Date(Date.now() + i * 86400000);
      const dateKey = getUTCDateKey(date);
      const word = candidates[i % Math.max(candidates.length, 1)] ?? pool[i % Math.max(pool.length, 1)];
      if (!word) continue;
      const game = await prisma.game.upsert({
        where: { mode_dateKey_length_difficulty: { mode: 'DAILY', dateKey, length: parsed.data.length, difficulty: parsed.data.difficulty } },
        update: { answerWordId: word.id, isActive: true, maxAttempts: 6 },
        create: { mode: 'DAILY', dateKey, length: parsed.data.length, difficulty: parsed.data.difficulty, maxAttempts: 6, hardModeAllowed: true, answerWordId: word.id, isActive: true }
      });
      created.push(game.id);
    }
    await audit(user!.id, 'SCHEDULE_AUTOFILL', 'GAME', null, parsed.data);
    return ok({ createdCount: created.length, gameIds: created });
  }

  return fail('VALIDATION_ERROR', 'type must be assign or autofill', 400);
}
