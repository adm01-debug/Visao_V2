/**
 * Internationalization utilities
 */

const translations: Record<string, Record<string, string>> = {};
let currentLocale = "pt-BR";

export function setLocale(locale: string): void {
  currentLocale = locale;
}

export function getLocale(): string {
  return currentLocale;
}

export function addTranslations(locale: string, messages: Record<string, string>): void {
  translations[locale] = { ...translations[locale], ...messages };
}

export function t(key: string, params?: Record<string, string>): string {
  let message = translations[currentLocale]?.[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      message = message.replace(`{${k}}`, v);
    });
  }
  return message;
}

export default { setLocale, getLocale, addTranslations, t };

