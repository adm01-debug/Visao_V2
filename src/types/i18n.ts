export type Locale = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'zh-CN' | 'ja-JP' | 'it-IT' | 'ko-KR';
export interface TranslationKeys { common: Record<string, string>; alerts: Record<string, string>; cameras: Record<string, string>; settings: Record<string, string>; }
export type TranslationFunction = (key: string, params?: Record<string, string>) => string;
