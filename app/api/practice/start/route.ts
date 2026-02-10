import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { requireUser } from '@/lib/server/auth';

export async function POST() {
  const user = await requireUser();
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);
  const count = await prisma.word.count({ where: { isActive: true, length: 5 } });
  if (!count) return fail('NOT_FOUND', 'No words available', 404);
  const skip = Math.floor(Math.random() * count);
  const word = await prisma.word.findFirst({ where: { isActive: true, length: 5 }, skip });
  if (!word) return fail('NOT_FOUND', 'No words available', 404);

  const game = await prisma.game.create({
    data: { mode: 'PRACTICE', length: 5, maxAttempts: 6, hardModeAllowed: true, difficulty: 'medium', answerWordId: word.id, dictionaryMode: 'STRICT', allowReplay: true }
  });

  return ok({ gameId: game.id, mode: game.mode, length: game.length, maxAttempts: game.maxAttempts }, 201);
}
