export function canStartSharedGame(params: { isActive: boolean; startAt: Date | null; endAt: Date | null }) {
  const now = new Date();
  if (!params.isActive) return { allowed: false, reason: 'inactive' };
  if (params.startAt && params.startAt > now) return { allowed: false, reason: 'not_started' };
  if (params.endAt && params.endAt < now) return { allowed: false, reason: 'ended' };
  return { allowed: true };
}
