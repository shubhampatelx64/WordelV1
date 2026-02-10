import { prisma } from '@/lib/server/prisma';
import { fail, ok } from '@/lib/server/response';
import { requireUser } from '@/lib/server/auth';

export async function GET() {
  const user = await requireUser();
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);

  const completed = await prisma.gamePlay.findMany({
    where: { userId: user.id, status: { in: ['WIN', 'LOSS'] } },
    include: { game: true },
    orderBy: { completedAt: 'desc' },
    take: 200
  });

  const wins = completed.filter((g) => g.status === 'WIN');
  const winRate = completed.length ? Math.round((wins.length / completed.length) * 100) : 0;

  const asc = [...completed].sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0));
  let streak = 0;
  for (let i = asc.length - 1; i >= 0; i -= 1) {
    if (asc[i].status === 'WIN') streak += 1;
    else break;
  }

  return ok({
    streak,
    winRate,
    last10Results: completed.slice(0, 10).map((g) => ({ dateKey: g.game.dateKey, status: g.status, attemptsUsed: g.attemptsUsed, score: g.score }))
  });
}
