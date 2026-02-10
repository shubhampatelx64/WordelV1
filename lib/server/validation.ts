import { ZodSchema } from 'zod';
import { fail } from './response';

export async function parseJson<T>(req: Request, schema: ZodSchema<T>) {
  const body = await req.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: fail('VALIDATION_ERROR', 'Invalid request payload', 400, result.error.flatten()) };
  }
  return { data: result.data };
}
