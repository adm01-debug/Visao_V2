/**
 * Public API v1 — Schemas Zod (Onda 56).
 *
 * Valida payloads das rotas mutáveis da /public-api.
 * Erros retornam 400 com detalhes machine-readable.
 */
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const uuid = z.string().uuid();
const isoDate = z.string().datetime({ offset: true }).optional();

/** POST /v1/cameras/:id/arm | disarm */
export const armDisarmSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  scheduled_until: isoDate,
}).strict();

/** POST /v1/alerts/:id/acknowledge */
export const acknowledgeAlertSchema = z.object({
  note: z.string().trim().max(1000).optional(),
}).strict();

/** POST /v1/panic */
export const panicSchema = z.object({
  camera_id: uuid.optional(),
  latitude: z.number().gte(-90).lte(90).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
  message: z.string().trim().max(500).optional(),
}).strict();

/** GET /v1/clips/:id/url?ttl=... */
export const clipUrlQuerySchema = z.object({
  ttl: z.coerce.number().int().min(60).max(604800).default(3600),
}).strict();

/** GET /v1/events/summary?from&to */
export const eventsSummaryQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  group_by: z.enum(["day", "hour", "camera", "severity"]).default("day"),
}).strict();

export type ArmDisarmInput = z.infer<typeof armDisarmSchema>;
export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type PanicInput = z.infer<typeof panicSchema>;

/**
 * Wrapper padrão para validar body JSON.
 * Retorna { data } em sucesso ou { error } com issues Zod normalizados.
 */
export function parseBody<T>(
  schema: z.ZodType<T>,
  raw: unknown,
): { data: T } | { error: { message: string; issues: Array<{ path: string; message: string }> } } {
  const r = schema.safeParse(raw);
  if (r.success) return { data: r.data };
  return {
    error: {
      message: "Payload inválido",
      issues: r.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    },
  };
}
