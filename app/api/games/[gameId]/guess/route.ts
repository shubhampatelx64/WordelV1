import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { requireUser } from '@/lib/server/auth';
import { evaluateGuess, patternString } from '@/lib/domain/evaluate';
import { parseJson } from '@/lib/server/validation';
import { calculateScore } from '@/lib/domain/scoring';
import { takeRateLimit } from '@/lib/server/rate-limit';
import { validateHardMode } from '@/lib/domain/hard-mode';
import { NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/server/security';

const schema = z.object({ guessText: z.string().min(1).max(10) });

export async function POST(req: NextRequest, { params }: { params: { gameId: string } }) {
  if (!assertSameOrigin(req)) return fail('CSRF_FORBIDDEN', 'Invalid origin', 403);
  const user = await requireUser();
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);
  const ip = req.headers.get('x-forwarded-for') ?? user.id;
  if (!takeRateLimit(`guess:${ip}`, 30, 60_000)) return fail('RATE_LIMITED', 'Too many guesses', 429);

  const parsed = await parseJson(req, schema);
  if (parsed.error) return parsed.error;
  const guessText = parsed.data.guessText.toUpperCase().trim();

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const gamePlay = await tx.gamePlay.findUnique({
      where: { gameId_userId: { gameId: params.gameId, userId: user.id } },
      include: {
        guesses: { orderBy: { createdAt: 'asc' } },
        game: { include: { answerWord: true } }
      }
    });

    if (!gamePlay) return fail('NOT_FOUND', 'Start game before guessing', 404);
    if (gamePlay.status !== 'IN_PROGRESS') return fail('GAME_ALREADY_COMPLETE', 'Game already complete', 409);
    if (guessText.length !== gamePlay.game.length) return fail('VALIDATION_ERROR', 'Guess has wrong length', 400);
    if (!/^[A-Z]+$/.test(guessText)) return fail('VALIDATION_ERROR', 'Guess must contain A-Z only', 400);

    const allowed = await tx.word.findUnique({ where: { text: guessText } });
    if (!allowed || !allowed.isActive) return fail('INVALID_WORD', 'Guess is not in dictionary', 400);

    if (gamePlay.hardMode) {
      const ruleError = validateHardMode(
        gamePlay.guesses.map((g: { resultPattern: string }) => g.resultPattern),
        gamePlay.guesses.map((g: { guessText: string }) => g.guessText),
        guessText
      );
      if (ruleError) return fail('HARD_MODE_RULE', ruleError, 400);
    }

    const pattern = patternString(evaluateGuess(gamePlay.game.answerWord.text, guessText));
    const attemptsUsed = gamePlay.attemptsUsed + 1;
    const isWin = pattern === 'G'.repeat(gamePlay.game.length);
    const isLoss = !isWin && attemptsUsed >= gamePlay.game.maxAttempts;
    const status = isWin ? 'WIN' : isLoss ? 'LOSS' : 'IN_PROGRESS';
    const completedAt = status === 'IN_PROGRESS' ? null : new Date();
    const timeMs = completedAt ? completedAt.getTime() - gamePlay.startedAt.getTime() : gamePlay.timeMs;
    const score = status === 'IN_PROGRESS' ? 0 : calculateScore(status, attemptsUsed, timeMs);

    await tx.guess.create({ data: { gamePlayId: gamePlay.id, guessText, resultPattern: pattern } });
    const updated = await tx.gamePlay.update({
      where: { id: gamePlay.id },
      data: { attemptsUsed, status, completedAt, timeMs, score }
    });

    if (status !== 'IN_PROGRESS') {
      await tx.leaderboardEntry.upsert({
        where: { gameId_userId: { gameId: gamePlay.gameId, userId: user.id } },
        update: { score, attemptsUsed, timeMs },
        create: {
          dateKey: gamePlay.game.dateKey,
          gameId: gamePlay.gameId,
          userId: user.id,
          score,
          attemptsUsed,
          timeMs
        }
      });
    }

    return ok({
      resultPattern: pattern,
      attemptsUsed: updated.attemptsUsed,
      remainingAttempts: gamePlay.game.maxAttempts - updated.attemptsUsed,
      status: updated.status,
      score: updated.score
    });
  }, { isolationLevel: 'Serializable' });
}
