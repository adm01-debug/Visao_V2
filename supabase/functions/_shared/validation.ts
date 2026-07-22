/**
 * Shared Zod validation schemas for Edge Functions
 * Centralized input validation for security hardening
 */

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export { z };

// ==========================================
// Common schemas
// ==========================================

export const uuidSchema = z.string().uuid();

/**
 * Schema para arquivos de imagem base64 com validação de assinatura (magic bytes)
 */
export const imageBase64Schema = z.string()
  .min(10)
  .max(10_000_000)
  .refine((val) => {
    // Remove prefix data:image/...;base64, se existir para validar o conteúdo
    const pureBase64 = val.includes(',') ? val.split(',')[1] : val;
    if (!pureBase64) return false;
    
    // Verifica assinaturas comuns de imagem em base64
    const prefix = pureBase64.substring(0, 15);
    return prefix.includes('/9j/') || prefix.includes('iVBORw') || prefix.includes('UklGR');
  }, {
    message: "Assinatura de imagem inválida. Apenas JPEG, PNG e WebP são permitidos."
  });

// ==========================================
// analyze-image
// ==========================================

export const analyzeImageSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: imageBase64Schema.optional(),
  analysisType: z.enum(["security", "productivity", "safety"]).default("security"),
}).refine(
  (data) => data.imageUrl || data.imageBase64,
  { message: "Either imageUrl or imageBase64 is required" }
);

// ==========================================
// analyze-license-plate
// ==========================================

export const analyzeLicensePlateSchema = z.object({
  image: imageBase64Schema,
});

// ==========================================
// detect-faces
// ==========================================

export const detectFacesSchema = z.object({
  imageBase64: imageBase64Schema,
  minConfidence: z.number().min(0).max(1).default(0.5),
  maxFaces: z.number().int().min(1).max(50).default(10),
  returnLandmarks: z.boolean().default(false),
});

// ==========================================
// compare-faces
// ==========================================

export const compareFacesSchema = z.object({
  sourceImage: imageBase64Schema,
  targetImage: imageBase64Schema,
  threshold: z.number().min(0).max(1).default(0.6),
});

// ==========================================
// detect-behavior
// ==========================================

export const detectBehaviorSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: imageBase64Schema.optional(),
  cameraId: z.string().uuid().optional(),
  cameraName: z.string().max(255).optional(),
}).refine(
  (data) => data.imageUrl || data.imageBase64,
  { message: "Either imageUrl or imageBase64 is required" }
);

// ==========================================
// generate-face-encoding
// ==========================================

export const generateFaceEncodingSchema = z.object({
  imageBase64: imageBase64Schema,
  personId: z.string().uuid().optional(),
});

// ==========================================
// send-telegram
// ==========================================

export const sendTelegramSchema = z.object({
  botToken: z.string().min(10, "botToken is required"),
  chatId: z.string().min(1, "chatId is required"),
  message: z.string().min(1).max(4096, "Message too long"),
  parseMode: z.enum(["HTML", "Markdown"]).default("HTML"),
  photo: z.string().optional(),
});

// ==========================================
// send-alert-notification
// ==========================================

export const sendAlertNotificationSchema = z.object({
  alertId: z.string().min(1, "alertId is required"),
  type: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  message: z.string().min(1).max(2000),
  cameraName: z.string().min(1).max(255),
  timestamp: z.string(),
  snapshotUrl: z.string().url().optional(),
  channels: z.array(z.enum(["email", "telegram", "whatsapp", "webhook", "push"])).min(1),
  recipients: z.object({
    emails: z.array(z.string().email()).optional(),
    phones: z.array(z.string()).optional(),
    webhookUrls: z.array(z.string().url()).optional(),
  }).optional(),
  telegram: z.object({
    botToken: z.string().min(10),
    chatId: z.string().min(1),
  }).optional(),
});

// ==========================================
// process-automation-rules
// ==========================================

const pointSchema = z.object({ x: z.number(), y: z.number() });
const boundingBoxSchema = z.object({
  x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(),
});

export const processAutomationRulesSchema = z.object({
  alert: z.object({
    id: z.string().min(1),
    type: z.string(),
    severity: z.string(),
    message: z.string(),
    camera_id: z.string().nullable(),
    camera_name: z.string(),
    timestamp: z.string(),
    user_id: z.string().uuid(),
  }),
  detection: z.object({
    bounding_box: boundingBoxSchema.nullish(),
    point: pointSchema.nullish(),
  }).nullish(),
});

// ==========================================
// admin-users (POST body)
// ==========================================

export const adminUsersUpdateRoleSchema = z.object({
  user_id: z.string().uuid("user_id must be a valid UUID"),
  new_role: z.enum(["admin", "manager", "operator", "viewer"]),
});

// ==========================================
// Validation helper
// ==========================================

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  corsHeaders: Record<string, string>
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.flatten();
  const messages = [
    ...Object.entries(errors.fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`),
    ...errors.formErrors,
  ];
  return {
    success: false,
    response: new Response(
      JSON.stringify({ error: "Validation failed", details: messages }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    ),
  };
}
