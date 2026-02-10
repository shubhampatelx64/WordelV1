import { fail } from '@/lib/server/response';

export async function POST() {
  return fail('DEPRECATED', 'Use POST /api/games/:gameId/hint', 410);
}
