/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Service: translationService
 * 
 * Serviço de tradução automática utilizando múltiplos providers
 * Suporta: Google Translate, DeepL, Azure Translator, LibreTranslate
 */

import { supabase } from '@/integrations/supabase/client';

// Tipos
export interface TranslationRequest {
  text: string | string[];
  sourceLang?: string;
  targetLang: string;
  provider?: TranslationProvider;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  provider: TranslationProvider;
  confidence?: number;
  alternatives?: string[];
}

export interface DetectedLanguage {
  language: string;
  confidence: number;
  isReliable: boolean;
}

export type TranslationProvider = 'google' | 'deepl' | 'azure' | 'libre' | 'auto';

export interface TranslationConfig {
  defaultProvider: TranslationProvider;
  fallbackProviders: TranslationProvider[];
  cacheEnabled: boolean;
  cacheTTL: number; // em segundos
  maxRetries: number;
  timeout: number; // em ms
}

// Cache de traduções
const translationCache = new Map<string, { result: TranslationResult; timestamp: number }>();

// Configuração padrão
const defaultConfig: TranslationConfig = {
  defaultProvider: 'auto',
  fallbackProviders: ['google', 'deepl', 'libre'],
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hora
  maxRetries: 3,
  timeout: 10000,
};

let config: TranslationConfig = { ...defaultConfig };

/**
 * Configura o serviço de tradução
 */
export function configure(newConfig: Partial<TranslationConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Gera chave de cache
 */
function getCacheKey(text: string, sourceLang: string, targetLang: string): string {
  return `${sourceLang}:${targetLang}:${text}`;
}

/**
 * Verifica cache
 */
function checkCache(text: string, sourceLang: string, targetLang: string): TranslationResult | null {
  if (!config.cacheEnabled) return null;
  
  const key = getCacheKey(text, sourceLang, targetLang);
  const cached = translationCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < config.cacheTTL * 1000) {
    return cached.result;
  }
  
  return null;
}

/**
 * Salva no cache
 */
function saveCache(text: string, sourceLang: string, targetLang: string, result: TranslationResult): void {
  if (!config.cacheEnabled) return;
  
  const key = getCacheKey(text, sourceLang, targetLang);
  translationCache.set(key, { result, timestamp: Date.now() });
  
  // Limpa cache antigo periodicamente
  if (translationCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of translationCache.entries()) {
      if (now - v.timestamp > config.cacheTTL * 1000) {
        translationCache.delete(k);
      }
    }
  }
}

/**
 * Detecta o idioma de um texto
 */
export async function detectLanguage(text: string): Promise<DetectedLanguage> {
  try {
    // Usar edge function para detecção
    const { data, error } = await supabase.functions.invoke('detect-language', {
      body: { text },
    });

    if (error) throw error;

    return {
      language: data.language || 'unknown',
      confidence: data.confidence || 0,
      isReliable: data.confidence > 0.8,
    };
  } catch (error) {
    console.error('Erro ao detectar idioma:', error);
    // Fallback: detecção básica por caracteres
    return detectLanguageBasic(text);
  }
}

/**
 * Detecção básica de idioma por padrões de caracteres
 */
function detectLanguageBasic(text: string): DetectedLanguage {
  const patterns: Record<string, RegExp> = {
    'zh': /[\u4e00-\u9fff]/,
    'ja': /[\u3040-\u309f\u30a0-\u30ff]/,
    'ko': /[\uac00-\ud7af]/,
    'ar': /[\u0600-\u06ff]/,
    'he': /[\u0590-\u05ff]/,
    'ru': /[\u0400-\u04ff]/,
    'th': /[\u0e00-\u0e7f]/,
    'pt': /[áàâãéèêíìîóòôõúùûç]/i,
    'es': /[áéíóúñ¿¡]/i,
    'fr': /[àâæçéèêëïîôœùûü]/i,
    'de': /[äöüß]/i,
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return { language: lang, confidence: 0.6, isReliable: false };
    }
  }

  // Default para inglês
  return { language: 'en', confidence: 0.5, isReliable: false };
}

/**
 * Traduz texto
 */
export async function translate(request: TranslationRequest): Promise<TranslationResult | TranslationResult[]> {
  const texts = Array.isArray(request.text) ? request.text : [request.text];
  const results: TranslationResult[] = [];

  for (const text of texts) {
    // Detectar idioma de origem se não especificado
    const sourceLang = request.sourceLang || (await detectLanguage(text)).language;
    
    // Verificar cache
    const cached = checkCache(text, sourceLang, request.targetLang);
    if (cached) {
      results.push(cached);
      continue;
    }

    // Tentar traduzir
    const result = await translateWithFallback(text, sourceLang, request.targetLang, request.provider);
    results.push(result);
    
    // Salvar no cache
    saveCache(text, sourceLang, request.targetLang, result);
  }

  return Array.isArray(request.text) ? results : results[0];
}

/**
 * Traduz com fallback para outros providers
 */
async function translateWithFallback(
  text: string,
  sourceLang: string,
  targetLang: string,
  preferredProvider?: TranslationProvider
): Promise<TranslationResult> {
  const providers = preferredProvider && preferredProvider !== 'auto'
    ? [preferredProvider, ...config.fallbackProviders.filter(p => p !== preferredProvider)]
    : config.fallbackProviders;

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      return await translateWithProvider(text, sourceLang, targetLang, provider);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Provider ${provider} falhou:`, error);
      continue;
    }
  }

  throw new Error(`Todos os providers falharam. Último erro: ${lastError?.message}`);
}

/**
 * Traduz usando um provider específico
 */
async function translateWithProvider(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: TranslationProvider
): Promise<TranslationResult> {
  const { data, error } = await supabase.functions.invoke('translate', {
    body: {
      text,
      sourceLang,
      targetLang,
      provider,
    },
  });

  if (error) throw error;

  return {
    originalText: text,
    translatedText: data.translatedText,
    sourceLang: sourceLang,
    targetLang: targetLang,
    provider: provider,
    confidence: data.confidence,
    alternatives: data.alternatives,
  };
}

/**
 * Traduz textos em lote de forma otimizada
 */
export async function translateBatch(
  texts: string[],
  targetLang: string,
  sourceLang?: string
): Promise<TranslationResult[]> {
  // Agrupa textos por idioma de origem detectado
  const groups = new Map<string, string[]>();
  
  for (const text of texts) {
    const lang = sourceLang || (await detectLanguage(text)).language;
    if (!groups.has(lang)) {
      groups.set(lang, []);
    }
    groups.get(lang)!.push(text);
  }

  // Traduz cada grupo
  const results: TranslationResult[] = [];
  
  for (const [lang, groupTexts] of groups.entries()) {
    const groupResults = await translate({
      text: groupTexts,
      sourceLang: lang,
      targetLang,
    }) as TranslationResult[];
    
    results.push(...groupResults);
  }

  return results;
}

/**
 * Lista de idiomas suportados
 */
export const SUPPORTED_LANGUAGES = {
  'pt': 'Português',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'it': 'Italiano',
  'nl': 'Nederlands',
  'ru': 'Русский',
  'zh': '中文',
  'ja': '日本語',
  'ko': '한국어',
  'ar': 'العربية',
  'he': 'עברית',
  'tr': 'Türkçe',
  'pl': 'Polski',
  'uk': 'Українська',
  'vi': 'Tiếng Việt',
  'th': 'ไทย',
  'id': 'Bahasa Indonesia',
  'ms': 'Bahasa Melayu',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Verifica se um idioma é suportado
 */
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
  return lang in SUPPORTED_LANGUAGES;
}

/**
 * Limpa o cache de traduções
 */
export function clearCache(): void {
  translationCache.clear();
}

/**
 * Estatísticas do cache
 */
export function getCacheStats(): { size: number; hitRate: number } {
  return {
    size: translationCache.size,
    hitRate: 0, // Implementar tracking de hits
  };
}

export default {
  translate,
  translateBatch,
  detectLanguage,
  configure,
  clearCache,
  getCacheStats,
  SUPPORTED_LANGUAGES,
  isLanguageSupported,
};
