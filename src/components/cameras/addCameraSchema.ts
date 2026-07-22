import { z } from "zod";

const RTSP_REGEX = /^rtsps?:\/\/.+/i;

export const addCameraSchema = z
  .object({
    name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(80),
    location: z.string().trim().max(120).optional().or(z.literal("")),
    brand: z.enum(["hikvision", "dahua", "intelbras", "generica"]).default("generica"),
    rtspUrl: z
      .string()
      .trim()
      .min(8, "URL RTSP obrigatória")
      .max(2048)
      .regex(RTSP_REGEX, "Deve começar com rtsp:// ou rtsps://"),
    substreamUrl: z
      .string()
      .trim()
      .max(2048)
      .regex(RTSP_REGEX, "Deve começar com rtsp:// ou rtsps://")
      .optional()
      .or(z.literal("")),
    username: z.string().trim().max(128).optional().or(z.literal("")),
    password: z.string().max(256).optional().or(z.literal("")),
    ptzEnabled: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const embedded = hasEmbeddedCredentials(data.rtspUrl);
    if (!embedded) {
      if (!data.username || data.username.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["username"],
          message: "Usuário obrigatório quando não está embutido na URL",
        });
      }
      if (!data.password || data.password.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Senha obrigatória quando não está embutida na URL",
        });
      }
    }
  });

export type AddCameraFormValues = z.infer<typeof addCameraSchema>;

/** Detecta se a URL já traz `user:pass@` embutido. */
export function hasEmbeddedCredentials(url: string): boolean {
  try {
    const parsed = new URL(url);
    return Boolean(parsed.username && parsed.password);
  } catch {
    return false;
  }
}

/**
 * Constrói a URL RTSP final com credenciais embutidas.
 * Se a URL já contém credenciais, retorna a URL como está.
 * Se não, injeta user:pass usando `URL()` para escapar caracteres corretamente.
 */
export function buildRtspUrl(rawUrl: string, username?: string, password?: string): string {
  const parsed = new URL(rawUrl);
  if (parsed.username && parsed.password) {
    return parsed.toString();
  }
  if (username) parsed.username = encodeURIComponent(username);
  if (password) parsed.password = encodeURIComponent(password);
  return parsed.toString();
}
