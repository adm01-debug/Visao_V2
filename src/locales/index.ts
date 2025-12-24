import ptBR from "./pt-BR.json";
import enUS from "./en-US.json";
import esES from "./es-ES.json";

export const locales = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
};

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "pt-BR";
export const availableLocales: Locale[] = ["pt-BR", "en-US", "es-ES"];

export function getTranslation(locale: Locale, key: string): string {
  const keys = key.split(".");
  let value: unknown = locales[locale];
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return (value as string) || key;
}

export function getLocaleDisplayName(locale: Locale): string {
  const names: Record<Locale, string> = {
    "pt-BR": "Português (Brasil)",
    "en-US": "English (US)",
    "es-ES": "Español (España)",
  };
  return names[locale];
}
