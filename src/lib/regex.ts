/**
 * Regex utilities - Re-exports from @/utils/regex
 * src/utils/regex is the source of truth
 */

export {
  patterns,
  isEmail,
  isPhone,
  isUrl,
  isIpv4,
  isUuid,
  isHex,
  isCpf,
  isCnpj,
  isCep,
  isLicensePlate,
  isSlug,
  isStrongPassword,
  escapeRegex,
  matchAll,
  replaceAll,
  extractMatches,
  countMatches,
  testWithFlags,
} from '@/utils/regex';

import { patterns, escapeRegex } from '@/utils/regex';

// Legacy aliases for backward compatibility
export const EMAIL = patterns.email;
export const URL = patterns.url;
export const PHONE = patterns.phone;
export const UUID = patterns.uuid;
export const IP = patterns.ipv4;

export function test(regex: RegExp, value: string): boolean {
  return regex.test(value);
}

export function match(regex: RegExp, value: string): RegExpMatchArray | null {
  return value.match(regex);
}

export const escape = escapeRegex;

export default {
  EMAIL,
  URL,
  PHONE,
  UUID,
  IP,
  test,
  match,
  escape,
  patterns,
};
