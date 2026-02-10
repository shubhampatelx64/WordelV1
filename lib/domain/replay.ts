export type PlayState = { status: 'IN_PROGRESS' | 'WIN' | 'LOSS' } | null;

export function canStartDaily(existing: PlayState): { allowed: boolean; reason?: string; resumed?: boolean } {
  if (!existing) return { allowed: true, resumed: false };
  if (existing.status === 'IN_PROGRESS') return { allowed: true, resumed: true };
  return { allowed: false, reason: 'Daily game already completed' };
}
