/**
 * Internationalization (i18n) Configuration
 * @see https://react.i18next.com/
 */

// Note: Install dependencies:
// npm install react-i18next i18next i18next-browser-languagedetector

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';

export const defaultNS = 'translation';
export const resources = {
  'pt-BR': { translation: ptBR },
  'en-US': { translation: enUS },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en-US'],
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: true,
    },
  });

export default i18n;

// Type-safe translation hook
export { useTranslation } from 'react-i18next';
