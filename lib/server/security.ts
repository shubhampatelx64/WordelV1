import { NextRequest } from 'next/server';

export function assertSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('host');
  return host ? origin.includes(host) : false;
}
