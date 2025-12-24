import ptBR from "./pt-BR.json";
import enUS from "./en-US.json";
export const locales = { "pt-BR": ptBR, "en-US": enUS };
export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "pt-BR";
export function getTranslation(locale: Locale, key: string): string {
  const keys = key.split(".");
  let value: unknown = locales[locale];
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return (value as string) || key;
}
