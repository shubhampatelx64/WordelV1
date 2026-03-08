import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { requireUser } from '@/lib/server/auth';
import { generateShareCode } from '@/lib/server/share-code';
import { takeRateLimit } from '@/lib/server/rate-limit';
import { NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/server/security';

const createRoomSchema = z.object({
  word: z.string().min(4).max(10).regex(/^[a-zA-Z]+$/, 'Word must contain only letters'),
  maxAttempts: z.number().int().min(1).max(12).default(6),
  hardModeAllowed: z.boolean().default(true),
  allowReplay: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) return fail('CSRF_FORBIDDEN', 'Invalid origin', 403);
  const user = await requireUser();
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);

  const ip = req.headers.get('x-forwarded-for') ?? user.id;
  if (!takeRateLimit(`room-create:${ip}`, 10, 60_000))
    return fail('RATE_LIMITED', 'Too many room creations', 429);

  const body = await req.json().catch(() => null);
  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success)
    return fail('VALIDATION_ERROR', 'Invalid room payload', 400, parsed.error.flatten());

  const wordText = parsed.data.word.toUpperCase().trim();
  const wordLength = wordText.length;

  // Upsert the word into the Word table so answerWordId FK is satisfied
  let word = await prisma.word.findUnique({ where: { text: wordText } });
  if (!word) {
    word = await prisma.word.create({
      data: {
        text: wordText,
        length: wordLength,
        difficulty: 'medium',
        tags: ['custom'],
        isActive: true,
      },
    });
  }

  let shareCode = generateShareCode();
  for (let i = 0; i < 4; i += 1) {
    const exists = await prisma.game.findUnique({ where: { shareCode } });
    if (!exists) break;
    shareCode = generateShareCode();
  }

  const game = await prisma.game.create({
    data: {
      mode: 'CUSTOM',
      creatorUserId: user.id,
      shareCode,
      answerWordId: word.id,
      length: wordLength,
      maxAttempts: parsed.data.maxAttempts,
      hardModeAllowed: parsed.data.hardModeAllowed,
      dictionaryMode: 'RELAXED',
      difficulty: 'medium',
      allowReplay: parsed.data.allowReplay,
      isActive: true,
    },
  });

  return ok({ gameId: game.id, shareCode: game.shareCode }, 201);
}
