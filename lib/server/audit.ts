import { prisma } from './prisma';

export async function audit(actorUserId: string, action: string, targetType: string, targetId: string | null, metadata: unknown) {
  await prisma.auditLog.create({
    data: { actorUserId, action, targetType, targetId, metadata: metadata as any }
  });
}
