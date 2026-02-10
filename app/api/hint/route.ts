import { takeRateLimit } from '@/lib/server/rate-limit';
import { fail } from '@/lib/server/response';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  if (!takeRateLimit(`hint:${ip}`, 5, 60_000)) return fail('RATE_LIMITED', 'Too many hint attempts', 429);
  return fail('NOT_IMPLEMENTED', 'Hints are not available in Phase 1', 501);
}
