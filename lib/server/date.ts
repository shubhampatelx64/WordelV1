export function getUTCDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
