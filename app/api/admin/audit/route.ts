import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { requireUser } from '@/lib/server/auth';
import { ensureRole } from '@/lib/server/permissions';
import { prisma } from '@/lib/server/prisma';

const query = z.object({ action: z.string().optional(), targetType: z.string().optional(), limit: z.coerce.number().min(1).max(200).optional() });

export async function GET(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN']);
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const parsed = query.safeParse({ action: searchParams.get('action') ?? undefined, targetType: searchParams.get('targetType') ?? undefined, limit: searchParams.get('limit') ?? 50 });
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid query', 400, parsed.error.flatten());
  const logs = await prisma.auditLog.findMany({
    where: { action: parsed.data.action, targetType: parsed.data.targetType },
    orderBy: { createdAt: 'desc' },
    take: parsed.data.limit,
    include: { actor: { select: { displayName: true, email: true } } }
  });
  return ok(logs);
}
