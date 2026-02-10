import { z } from 'zod';
import { fail, ok } from '@/lib/server/response';
import { requireUser } from '@/lib/server/auth';
import { ensureRole } from '@/lib/server/permissions';
import { prisma } from '@/lib/server/prisma';
import { audit } from '@/lib/server/audit';

const createSchema = z.object({
  text: z.string().regex(/^[A-Z]+$/).min(4).max(10),
  length: z.number().min(4).max(10),
  difficulty: z.string().min(1),
  tags: z.array(z.string()).default([]),
  hints: z.array(z.object({ type: z.enum(['DEFINITION', 'CATEGORY', 'SYNONYM', 'RIDDLE', 'FIRST_LETTER']), content: z.string().min(1), cost: z.number().int().min(0), order: z.number().int().min(1) })).max(3).default([])
});

const updateSchema = createSchema.partial().extend({ id: z.string() });

export async function GET() {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN', 'CREATOR']);
  if (deny) return deny;
  const words = await prisma.word.findMany({ include: { hints: { orderBy: { order: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  return ok(words);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN', 'CREATOR']);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid word payload', 400, parsed.error.flatten());
  if (parsed.data.text.length !== parsed.data.length) return fail('VALIDATION_ERROR', 'Text length mismatch', 400);

  const word = await prisma.word.create({
    data: {
      text: parsed.data.text,
      length: parsed.data.length,
      difficulty: parsed.data.difficulty,
      tags: parsed.data.tags,
      hints: { create: parsed.data.hints }
    },
    include: { hints: true }
  });
  await audit(user!.id, 'WORD_CREATE', 'WORD', word.id, { text: word.text });
  return ok(word, 201);
}

export async function PUT(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN', 'CREATOR']);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid update payload', 400, parsed.error.flatten());

  const { id, hints, ...rest } = parsed.data;
  const word = await prisma.word.update({ where: { id }, data: { ...rest, text: rest.text?.toUpperCase() } });
  if (hints) {
    await prisma.hint.deleteMany({ where: { wordId: id } });
    await prisma.hint.createMany({ data: hints.map((h) => ({ ...h, wordId: id })) });
  }
  await audit(user!.id, 'WORD_UPDATE', 'WORD', id, parsed.data);
  return ok(word);
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  const deny = ensureRole(user, ['ADMIN']);
  if (deny) return deny;
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return fail('VALIDATION_ERROR', 'id is required', 400);
  await prisma.hint.deleteMany({ where: { wordId: id } });
  await prisma.word.delete({ where: { id } });
  await audit(user!.id, 'WORD_DELETE', 'WORD', id, {});
  return ok({ deleted: true });
}
