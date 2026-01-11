/**
 * Regex utilities
 */

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const URL = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
export const PHONE = /^\+?[\d\s()-]{10,}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const IP = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export function test(regex: RegExp, value: string): boolean {
  return regex.test(value);
}

export function match(regex: RegExp, value: string): RegExpMatchArray | null {
  return value.match(regex);
}

export function escape(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\]/g, "\$&");
}

export default { EMAIL, URL, PHONE, UUID, IP, test, match, escape };

