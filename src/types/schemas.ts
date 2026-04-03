import { z } from 'zod';

// ═══════════════════════════════════════════
// Primitivas reutilizáveis
// ═══════════════════════════════════════════

export const emailSchema = z.string().trim().email('Email inválido').max(255, 'Email muito longo');
export const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
  .regex(/[a-z]/, 'Deve conter ao menos uma letra minúscula')
  .regex(/[0-9]/, 'Deve conter ao menos um número');
export const phoneSchema = z.string().regex(/^\d{10,11}$/, 'Telefone inválido (10-11 dígitos)');
export const uuidSchema = z.string().uuid('ID inválido');
export const urlSchema = z.string().url('URL inválida').max(2048, 'URL muito longa');
export const nameSchema = z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo');
export const notesSchema = z.string().trim().max(1000, 'Notas muito longas').optional();
export const latitudeSchema = z.number().min(-90).max(90).optional().nullable();
export const longitudeSchema = z.number().min(-180).max(180).optional().nullable();

// ═══════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha obrigatória'),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(100),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const newPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

// ═══════════════════════════════════════════
// Câmeras
// ═══════════════════════════════════════════

export const cameraSchema = z.object({
  name: nameSchema,
  location: z.string().trim().min(1, 'Localização é obrigatória').max(200),
  stream_url: urlSchema.optional().or(z.literal('')),
  thumbnail: urlSchema.optional().or(z.literal('')),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  status: z.enum(['online', 'offline', 'alert', 'warning']).default('offline'),
});

// ═══════════════════════════════════════════
// Alertas
// ═══════════════════════════════════════════

export const alertSchema = z.object({
  camera_name: z.string().trim().min(1, 'Nome da câmera obrigatório'),
  type: z.enum([
    'security', 'safety', 'operations', 'access', 'analytics',
    'absence', 'agglomeration', 'anomaly', 'panic', 'arm_disarm',
    'scene_change', 'camera_offline', 'recurrent_vehicle', 'qr_code_event',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string().trim().min(1, 'Mensagem obrigatória').max(500),
  camera_id: uuidSchema.optional().nullable(),
});

// ═══════════════════════════════════════════
// Zonas
// ═══════════════════════════════════════════

export const zoneSchema = z.object({
  name: nameSchema,
  type: z.enum(['restricted', 'monitoring', 'counting', 'speed']).default('restricted'),
  camera_id: uuidSchema.nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (formato: #RRGGBB)').default('#ff0000'),
  is_active: z.boolean().default(true),
  points: z.array(z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  })).min(3, 'Zona precisa de pelo menos 3 pontos'),
});

// ═══════════════════════════════════════════
// Pessoas (Reconhecimento Facial)
// ═══════════════════════════════════════════

export const personSchema = z.object({
  name: nameSchema,
  role: z.string().trim().max(50, 'Cargo muito longo').optional(),
  department: z.string().trim().max(50, 'Departamento muito longo').optional(),
  notes: notesSchema,
  list_type: z.enum(['whitelist', 'blacklist', 'none']).default('none'),
  is_active: z.boolean().default(true),
});

// ═══════════════════════════════════════════
// Veículos / Placas
// ═══════════════════════════════════════════

export const vehicleSchema = z.object({
  plate: z.string()
    .trim()
    .min(7, 'Placa deve ter pelo menos 7 caracteres')
    .max(8, 'Placa deve ter no máximo 8 caracteres')
    .regex(/^[A-Z0-9]+$/, 'Placa deve conter apenas letras maiúsculas e números'),
  owner: z.string().trim().max(100).optional(),
  model: z.string().trim().max(50).optional(),
  color: z.string().trim().max(30).optional(),
  type: z.enum(['whitelist', 'blacklist']).default('whitelist'),
  notes: notesSchema,
});

export const registeredPlateSchema = z.object({
  plate: z.string().trim().min(7).max(8).regex(/^[A-Z0-9]+$/, 'Placa inválida'),
  owner_name: z.string().trim().max(100).optional(),
  vehicle_type: z.string().trim().max(30).optional(),
  color: z.string().trim().max(30).optional(),
  list_type: z.enum(['whitelist', 'blacklist']).default('whitelist'),
  is_active: z.boolean().default(true),
  notes: notesSchema,
});

// ═══════════════════════════════════════════
// Regras de Automação
// ═══════════════════════════════════════════

export const ruleSchema = z.object({
  name: nameSchema,
  description: z.string().trim().max(500).optional(),
  category: z.enum(['security', 'safety', 'operations', 'access', 'analytics']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  is_active: z.boolean().default(true),
  cameras: z.array(z.string()).default([]),
  actions: z.array(z.enum(['alert', 'notify', 'record', 'lockdown', 'dispatch', 'arm', 'disarm', 'panic']))
    .min(1, 'Selecione pelo menos uma ação'),
  conditions: z.array(z.object({
    type: z.string().min(1),
    operator: z.string().min(1),
    value: z.unknown(),
  })).min(1, 'Adicione pelo menos uma condição'),
});

// ═══════════════════════════════════════════
// Configurações de Notificação
// ═══════════════════════════════════════════

export const notificationConfigSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(100),
  enabled: z.boolean().default(true),
  channels: z.array(z.string()).default([]),
  severity_filter: z.array(z.enum(['low', 'medium', 'high', 'critical'])).min(1, 'Selecione pelo menos uma severidade'),
  cooldown_minutes: z.number().int().min(1).max(1440).default(5),
  email_recipients: z.array(emailSchema).default([]),
  phone_recipients: z.array(phoneSchema).default([]),
  webhook_urls: z.array(urlSchema).default([]),
  schedule_enabled: z.boolean().default(false),
  schedule_start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').optional(),
  schedule_end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').optional(),
  schedule_days: z.array(z.number().int().min(0).max(6)).optional(),
});

// ═══════════════════════════════════════════
// Perfil
// ═══════════════════════════════════════════

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Nome muito curto').max(100).optional(),
  avatar_url: urlSchema.optional().or(z.literal('')),
});

// ═══════════════════════════════════════════
// Configuração de Gravação
// ═══════════════════════════════════════════

export const recordingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
  format: z.enum(['webm', 'mp4']).default('webm'),
  max_duration_seconds: z.number().int().min(60).max(86400).default(3600),
  max_file_size_mb: z.number().int().min(10).max(5000).default(500),
  retention_days: z.number().int().min(1).max(365).default(30),
  record_on_motion: z.boolean().default(false),
  record_on_alert: z.boolean().default(true),
  pre_buffer_seconds: z.number().int().min(0).max(60).default(5),
  post_buffer_seconds: z.number().int().min(0).max(120).default(10),
});

// ═══════════════════════════════════════════
// Types inferidos
// ═══════════════════════════════════════════

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
export type CameraInput = z.infer<typeof cameraSchema>;
export type AlertInput = z.infer<typeof alertSchema>;
export type ZoneInput = z.infer<typeof zoneSchema>;
export type PersonInput = z.infer<typeof personSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type RegisteredPlateInput = z.infer<typeof registeredPlateSchema>;
export type RuleInput = z.infer<typeof ruleSchema>;
export type NotificationConfigInput = z.infer<typeof notificationConfigSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type RecordingConfigInput = z.infer<typeof recordingConfigSchema>;
