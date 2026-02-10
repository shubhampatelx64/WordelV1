import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { requireUser } from '@/lib/server/auth';
import { ensureRole } from '@/lib/server/permissions';
import { prisma } from '@/lib/server/prisma';
import { audit } from '@/lib/server/audit';

const rowSchema = z.object({ text: z.string().regex(/^[A-Z]+$/), difficulty: z.string().default('medium'), tags: z.array(z.string()).default([]) });

export async function POST(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN']);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  const rows = z.array(rowSchema).safeParse(body?.rows ?? []);
  if (!rows.success) return fail('VALIDATION_ERROR', 'Invalid CSV rows payload', 400, rows.error.flatten());

  const inserted: string[] = [];
  const errors: string[] = [];
  for (const r of rows.data) {
    try {
      await prisma.word.create({ data: { text: r.text, length: r.text.length, difficulty: r.difficulty, tags: r.tags } });
      inserted.push(r.text);
    } catch {
      errors.push(r.text);
    }
  }
  await audit(user!.id, 'WORD_IMPORT', 'WORD', null, { inserted: inserted.length, errors: errors.length });
  return ok({ inserted, errors });
}
