import { z } from 'zod';

export const emailSchema = z.string().email('Email inválido');
export const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Deve conter maiúscula').regex(/[0-9]/, 'Deve conter número');
export const phoneSchema = z.string().regex(/^\d{10,11}$/, 'Telefone inválido');

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Senha obrigatória'), remember: z.boolean().optional() });
export const registerSchema = z.object({ name: z.string().min(2, 'Nome muito curto'), email: emailSchema, password: passwordSchema, confirmPassword: z.string() }).refine(data => data.password === data.confirmPassword, { message: 'Senhas não conferem', path: ['confirmPassword'] });

export const cameraSchema = z.object({ name: z.string().min(1, 'Nome obrigatório'), url: z.string().url('URL inválida'), location: z.string().optional() });
export const alertSchema = z.object({ type: z.string().min(1), severity: z.enum(['low', 'medium', 'high', 'critical']), message: z.string().min(1) });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CameraInput = z.infer<typeof cameraSchema>;
export type AlertInput = z.infer<typeof alertSchema>;
