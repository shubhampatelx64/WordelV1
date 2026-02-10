type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export function takeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
