import { z } from 'zod';
export const validationMiddleware = <T>(schema: z.ZodSchema<T>) => (data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: result.error };
};
