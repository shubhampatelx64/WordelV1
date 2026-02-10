import { fail, ok } from '@/lib/server/response';
import { prisma } from '@/lib/server/prisma';
import { requireUser } from '@/lib/server/auth';

export async function GET(_: Request, { params }: { params: { gameId: string } }) {
  const user = await requireUser();
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);
  const gamePlay = await prisma.gamePlay.findUnique({
    where: { gameId_userId: { gameId: params.gameId, userId: user.id } },
    include: { guesses: { orderBy: { createdAt: 'asc' } }, game: true }
  });
  if (!gamePlay) return fail('NOT_FOUND', 'No gameplay found. Start first.', 404);

  return ok({
    gameplayId: gamePlay.id,
    status: gamePlay.status,
    attemptsUsed: gamePlay.attemptsUsed,
    remainingAttempts: gamePlay.game.maxAttempts - gamePlay.attemptsUsed,
    hardMode: gamePlay.hardMode,
    guesses: gamePlay.guesses.map((g) => ({ guessText: g.guessText, resultPattern: g.resultPattern, createdAt: g.createdAt }))
  });
}
