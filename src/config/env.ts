/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Configuração de variáveis de ambiente
 * 
 * @module config/env
 */

export const ENV = {
  // App Mode
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  
  // API
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  
  // Supabase - Padronizado para PUBLISHABLE_KEY
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  // Alias para compatibilidade com código legado
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  
  // Sentry
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || '',
  
  // Features
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  
  // MediaMTX
  MEDIAMTX_URL: import.meta.env.VITE_MEDIAMTX_URL || 'http://localhost:8888',
  MEDIAMTX_API_URL: import.meta.env.VITE_MEDIAMTX_API_URL || 'http://localhost:9997',
  MEDIAMTX_WEBRTC_URL: import.meta.env.VITE_MEDIAMTX_WEBRTC_URL || 'http://localhost:8889',
  
  // App Info
  APP_NAME: import.meta.env.VITE_APP_NAME || 'VISÃO',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
} as const;

// Helper functions
export const isDev = () => ENV.DEV;
export const isProd = () => ENV.PROD;
export const isTest = () => ENV.MODE === 'test';

// Validação de variáveis obrigatórias
export const validateEnv = () => {
  const required = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];
  const missing = required.filter(key => !ENV[key as keyof typeof ENV]);
  
  if (missing.length > 0) {
}`);
    return false;
  }
  return true;
};
