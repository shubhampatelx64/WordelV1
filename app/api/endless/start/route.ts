import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { requireUser } from '@/lib/server/auth';
import { parseJson } from '@/lib/server/validation';
import { NextRequest } from 'next/server';

const schema = z.object({
  level: z.number().int().min(1).default(1),
});

function difficultyForLevel(level: number) {
  if (level <= 3) return { difficulty: 'easy', length: 5, maxAttempts: 6 };
  if (level <= 6) return { difficulty: 'medium', length: 5, maxAttempts: 6 };
  if (level <= 10) return { difficulty: 'medium', length: 5, maxAttempts: 5 };
  if (level <= 15) return { difficulty: 'hard', length: 6, maxAttempts: 6 };
  if (level <= 20) return { difficulty: 'hard', length: 6, maxAttempts: 5 };
  return { difficulty: 'hard', length: Math.min(7, 5 + Math.floor((level - 20) / 10)), maxAttempts: 5 };
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);

  const parsed = await parseJson(req, schema);
  if (parsed.error) return parsed.error;

  const level = parsed.data.level ?? 1;
  const config = difficultyForLevel(level);

  // Find a random word matching the config
  const where = { isActive: true, length: config.length };
  const count = await prisma.word.count({ where });
  if (!count) {
    // Fallback to any 5-letter word if no words of the target length exist
    const fallbackCount = await prisma.word.count({ where: { isActive: true, length: 5 } });
    if (!fallbackCount) return fail('NOT_FOUND', 'No words available', 404);
    const skip = Math.floor(Math.random() * fallbackCount);
    const word = await prisma.word.findFirst({ where: { isActive: true, length: 5 }, skip });
    if (!word) return fail('NOT_FOUND', 'No words available', 404);

    const game = await prisma.game.create({
      data: {
        mode: 'PRACTICE',
        length: 5,
        maxAttempts: config.maxAttempts,
        hardModeAllowed: true,
        difficulty: config.difficulty,
        answerWordId: word.id,
        dictionaryMode: 'RELAXED',
        allowReplay: false,
      },
    });

    return ok({ gameId: game.id, level, length: 5, maxAttempts: config.maxAttempts, difficulty: config.difficulty }, 201);
  }

  const skip = Math.floor(Math.random() * count);
  const word = await prisma.word.findFirst({ where, skip });
  if (!word) return fail('NOT_FOUND', 'No words available', 404);

  const game = await prisma.game.create({
    data: {
      mode: 'PRACTICE',
      length: config.length,
      maxAttempts: config.maxAttempts,
      hardModeAllowed: true,
      difficulty: config.difficulty,
      answerWordId: word.id,
      dictionaryMode: 'RELAXED',
      allowReplay: false,
    },
  });

  return ok({ gameId: game.id, level, length: config.length, maxAttempts: config.maxAttempts, difficulty: config.difficulty }, 201);
}
