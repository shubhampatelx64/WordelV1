import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { requireUser } from '@/lib/server/auth';
import { ensureRole } from '@/lib/server/permissions';
import { prisma } from '@/lib/server/prisma';
import { audit } from '@/lib/server/audit';

const updateSchema = z.object({ userId: z.string(), role: z.enum(['ADMIN', 'CREATOR', 'USER']).optional(), ban: z.boolean().optional() });

export async function GET() {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN']);
  if (deny) return deny;
  const users = await prisma.user.findMany({ select: { id: true, email: true, displayName: true, role: true, bannedAt: true, createdAt: true } });
  return ok(users);
}

export async function PUT(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN']);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid user update payload', 400, parsed.error.flatten());

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role, bannedAt: parsed.data.ban === undefined ? undefined : parsed.data.ban ? new Date() : null }
  });
  await audit(user!.id, 'USER_UPDATE', 'USER', updated.id, parsed.data);
  return ok({ id: updated.id, role: updated.role, bannedAt: updated.bannedAt });
}
