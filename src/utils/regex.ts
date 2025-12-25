/**
 * Regex Utilities & Common Patterns
 */

// Common patterns
export const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[\d\s\-()]{10,}$/,
  phoneBR: /^(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  ipv6: /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  hex: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
  datetime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/,
  cpf: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
  cnpj: /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
  cep: /^\d{5}-?\d{3}$/,
  licensePlate: /^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/,
  creditCard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  alpha: /^[a-zA-Z]+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  username: /^[a-zA-Z0-9_]{3,16}$/,
};

// Validation functions
export const isEmail = (str: string): boolean => patterns.email.test(str);
export const isPhone = (str: string): boolean => patterns.phone.test(str);
export const isUrl = (str: string): boolean => patterns.url.test(str);
export const isIpv4 = (str: string): boolean => patterns.ipv4.test(str);
export const isUuid = (str: string): boolean => patterns.uuid.test(str);
export const isHex = (str: string): boolean => patterns.hex.test(str);
export const isCpf = (str: string): boolean => patterns.cpf.test(str);
export const isCnpj = (str: string): boolean => patterns.cnpj.test(str);
export const isCep = (str: string): boolean => patterns.cep.test(str);
export const isLicensePlate = (str: string): boolean => patterns.licensePlate.test(str);
export const isSlug = (str: string): boolean => patterns.slug.test(str);
export const isStrongPassword = (str: string): boolean => patterns.strongPassword.test(str);

// Utility functions
export const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const matchAll = (str: string, regex: RegExp): RegExpMatchArray[] => {
  const matches: RegExpMatchArray[] = [];
  const globalRegex = new RegExp(regex, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let match;
  while ((match = globalRegex.exec(str)) !== null) matches.push(match);
  return matches;
};

export const replaceAll = (str: string, pattern: string | RegExp, replacement: string): string =>
  str.replace(new RegExp(escapeRegex(typeof pattern === 'string' ? pattern : pattern.source), 'g'), replacement);

export const extractMatches = (str: string, regex: RegExp): string[] =>
  matchAll(str, regex).map(m => m[0]);

export const countMatches = (str: string, regex: RegExp): number =>
  matchAll(str, regex).length;

export const testWithFlags = (str: string, pattern: string, flags = 'i'): boolean =>
  new RegExp(pattern, flags).test(str);
