/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Configuração do Supabase
 * 
 * @module config/supabase
 */

import { ENV } from './env';

export const SUPABASE_CONFIG = {
  url: ENV.SUPABASE_URL,
  // Usar PUBLISHABLE_KEY como padrão
  anonKey: ENV.SUPABASE_PUBLISHABLE_KEY,
  // Alias para compatibilidade
  publishableKey: ENV.SUPABASE_PUBLISHABLE_KEY,
  
  // Configurações de Auth
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  
  // Configurações de Realtime
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
} as const;

// Helper para verificar se Supabase está configurado
export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
};
