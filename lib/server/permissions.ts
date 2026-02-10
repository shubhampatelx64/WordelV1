import { fail } from './response';

export function ensureRole(user: { role: string } | null, roles: string[]) {
  if (!user) return fail('UNAUTHORIZED', 'Login required', 401);
  if (!roles.includes(user.role)) return fail('FORBIDDEN', 'Insufficient permissions', 403);
  return null;
}
