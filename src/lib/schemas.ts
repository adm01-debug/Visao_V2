/**
 * VISÃO - Schemas de validação Zod
 * Single source of truth para validação frontend + backend
 */

import { z } from 'zod';

// ============================================
// PESSOA / RECONHECIMENTO FACIAL
// ============================================

export const personFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  department: z.string().max(100, 'Departamento muito longo').optional().default(''),
  role: z.string().max(100, 'Cargo muito longo').optional().default(''),
  is_active: z.boolean().default(true),
  list_type: z.enum(['none', 'whitelist', 'blacklist', 'visitor']).default('none'),
  notes: z.string().max(500, 'Observações muito longas').optional().default(''),
});

export type PersonFormData = z.infer<typeof personFormSchema>;

// ============================================
// PLACA VEICULAR
// ============================================

const plateRegex = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

export const plateRegistrationSchema = z.object({
  plate: z.string()
    .min(7, 'Placa deve ter 7 caracteres')
    .max(7, 'Placa deve ter 7 caracteres')
    .regex(plateRegex, 'Formato inválido. Use ABC1D23 ou ABC1234'),
  owner_name: z.string().max(100).optional().default(''),
  vehicle_type: z.string().max(50).optional().default('car'),
  color: z.string().max(30).optional().default(''),
  notes: z.string().max(500).optional().default(''),
  list_type: z.enum(['whitelist', 'blacklist', 'visitor']).default('whitelist'),
});

export type PlateRegistrationData = z.infer<typeof plateRegistrationSchema>;

// ============================================
// CÂMERA
// ============================================

export const cameraFormSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').max(100),
  location: z.string().min(2, 'Localização obrigatória').max(200),
  stream_url: z.string().url('URL inválida').optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export type CameraFormData = z.infer<typeof cameraFormSchema>;

// ============================================
// REGRA DE AUTOMAÇÃO
// ============================================

export const ruleFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  description: z.string().max(500).optional().default(''),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.enum(['security', 'safety', 'operations', 'access', 'analytics']).default('security'),
  is_active: z.boolean().default(true),
});

export type RuleFormData = z.infer<typeof ruleFormSchema>;
