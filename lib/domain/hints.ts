export function nextHintIndex(usedCount: number, total: number) {
  if (usedCount >= total) return null;
  return usedCount;
}
