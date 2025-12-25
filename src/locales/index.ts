import ptBR from "./pt-BR.json";
import enUS from "./en-US.json";
import esES from "./es-ES.json";
import frFR from "./fr-FR.json";
import deDE from "./de-DE.json";
import itIT from "./it-IT.json";
import jaJP from "./ja-JP.json";
import koKR from "./ko-KR.json";
import zhCN from "./zh-CN.json";
import arSA from "./ar-SA.json";
import ruRU from "./ru-RU.json";
import hiIN from "./hi-IN.json";
import thTH from "./th-TH.json";
import viVN from "./vi-VN.json";
import nlNL from "./nl-NL.json";
import plPL from "./pl-PL.json";
import trTR from "./tr-TR.json";

export const locales = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
  "fr-FR": frFR,
  "de-DE": deDE,
  "it-IT": itIT,
  "ja-JP": jaJP,
  "ko-KR": koKR,
  "zh-CN": zhCN,
  "ar-SA": arSA,
  "ru-RU": ruRU,
  "hi-IN": hiIN,
  "th-TH": thTH,
  "vi-VN": viVN,
  "nl-NL": nlNL,
  "pl-PL": plPL,
  "tr-TR": trTR,
};

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "pt-BR";
export const availableLocales: Locale[] = [
  "pt-BR", "en-US", "es-ES", "fr-FR", "de-DE", "it-IT",
  "ja-JP", "ko-KR", "zh-CN", "ar-SA", "ru-RU", "hi-IN",
  "th-TH", "vi-VN", "nl-NL", "pl-PL", "tr-TR"
];

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
    "fr-FR": "Français (France)",
    "de-DE": "Deutsch (Deutschland)",
    "it-IT": "Italiano (Italia)",
    "ja-JP": "日本語",
    "ko-KR": "한국어",
    "zh-CN": "中文 (简体)",
    "ar-SA": "العربية",
    "ru-RU": "Русский",
    "hi-IN": "हिन्दी",
    "th-TH": "ไทย",
    "vi-VN": "Tiếng Việt",
    "nl-NL": "Nederlands",
    "pl-PL": "Polski",
    "tr-TR": "Türkçe",
  };
  return names[locale];
}
