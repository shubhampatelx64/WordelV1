import { z } from 'zod';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/server/prisma';
import { fail, ok } from '@/lib/server/response';
import { parseJson } from '@/lib/server/validation';
import { takeRateLimit } from '@/lib/server/rate-limit';
import { NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/server/security';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(30)
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) return fail('CSRF_FORBIDDEN', 'Invalid origin', 403);
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  if (!takeRateLimit(`signup:${ip}`, 10, 60_000)) {
    return fail('RATE_LIMITED', 'Too many sign up attempts', 429);
  }
  const parsed = await parseJson(req, schema);
  if (parsed.error) return parsed.error;
  const { email, password, displayName } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return fail('EMAIL_TAKEN', 'Email already in use', 409);

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, displayName, role: 'USER' },
    select: { id: true, email: true, displayName: true }
  });

  return ok(user, 201);
}
