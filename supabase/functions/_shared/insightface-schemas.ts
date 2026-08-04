/**
 * VISÃO — Wave 22: shared Zod schemas for InsightFace edge functions.
 * Defense-in-depth: reject malformed input before any Replicate call.
 */
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

/** Max ~7 MB base64 image (5 MB raw). Prevents oversized payloads / DoS. */
const IMAGE_MAX_LEN = 7_500_000;

const imageString = z
  .string()
  .min(1, 'image is required')
  .max(IMAGE_MAX_LEN, `image exceeds ${IMAGE_MAX_LEN} chars`);

export const DetectSchema = z.object({
  image: imageString,
  max_faces: z.number().int().min(1).max(50).optional(),
}).strict();

export const EncodeSchema = z.object({
  image: imageString,
  align: z.boolean().optional(),
}).strict();

export const AnalyzeSchema = z.object({
  image: imageString,
}).strict();

export const LivenessSchema = z.object({
  image: imageString,
  threshold: z.number().min(0.5).max(0.99).optional(),
}).strict();

export const MigrateBatchSchema = z.object({
  batch_size: z.number().int().min(1).max(50).optional(),
  dry_run: z.boolean().optional(),
}).strict();

export type DetectInput = z.infer<typeof DetectSchema>;
export type EncodeInput = z.infer<typeof EncodeSchema>;
export type AnalyzeInput = z.infer<typeof AnalyzeSchema>;
export type LivenessInput = z.infer<typeof LivenessSchema>;
export type MigrateBatchInput = z.infer<typeof MigrateBatchSchema>;

/** Parse JSON body against schema, throw structured error on failure. */
export async function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new Error('[400]: invalid JSON body');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`[400]: validation failed — ${issues}`);
  }
  return result.data;
}
