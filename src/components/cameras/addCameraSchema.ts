import { z } from 'zod';

const RTSP_REGEX = /^rtsps?:\/\/.+/i;
const HOST_REGEX = /^[a-zA-Z0-9.\-_:]+$/;

export const PTZ_PROTOCOLS = ['onvif', 'hikvision', 'dahua', 'axis'] as const;
export type PtzProtocol = (typeof PTZ_PROTOCOLS)[number];

export const DEFAULT_PTZ_PORT: Record<PtzProtocol, number> = {
  onvif: 80,
  hikvision: 80,
  dahua: 80,
  axis: 80,
};

export const ptzConfigSchema = z.object({
  protocol: z.enum(PTZ_PROTOCOLS).default('onvif'),
  endpoint: z
    .string()
    .trim()
    .min(3, 'Endpoint obrigatório (IP ou host)')
    .max(255)
    .regex(HOST_REGEX, 'Use apenas IP ou hostname, sem barras'),
  port: z.coerce.number().int().min(1).max(65535).default(80),
  channel: z.coerce.number().int().min(1).max(64).default(1),
  username: z.string().trim().min(1, 'Usuário PTZ obrigatório').max(128),
  password: z.string().min(1, 'Senha PTZ obrigatória').max(256),
  default_speed: z.coerce.number().min(0.1).max(1).default(0.5),
});

export type PtzConfigValues = z.infer<typeof ptzConfigSchema>;

export const addCameraSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(80),
    location: z.string().trim().max(120).optional().or(z.literal('')),
    brand: z.enum(['hikvision', 'dahua', 'intelbras', 'generica']).default('generica'),
    rtspUrl: z
      .string()
      .trim()
      .min(8, 'URL RTSP obrigatória')
      .max(2048)
      .regex(RTSP_REGEX, 'Deve começar com rtsp:// ou rtsps://'),
    substreamUrl: z
      .string()
      .trim()
      .max(2048)
      .regex(RTSP_REGEX, 'Deve começar com rtsp:// ou rtsps://')
      .optional()
      .or(z.literal('')),
    username: z.string().trim().max(128).optional().or(z.literal('')),
    password: z.string().max(256).optional().or(z.literal('')),
    ptzEnabled: z.boolean().default(false),
    ptzConfig: ptzConfigSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const embedded = hasEmbeddedCredentials(data.rtspUrl);
    if (!embedded) {
      if (!data.username || data.username.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['username'],
          message: 'Usuário obrigatório quando não está embutido na URL',
        });
      }
      if (!data.password || data.password.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Senha obrigatória quando não está embutida na URL',
        });
      }
    }
    if (data.ptzEnabled) {
      const parsed = ptzConfigSchema.safeParse(data.ptzConfig ?? {});
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ptzConfig', ...issue.path],
            message: issue.message,
          });
        }
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
