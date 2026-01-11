/**
 * Validator utilities
 */

export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isPhone(phone: string): boolean {
  return /^\+?[\d\s()-]{10,}$/.test(phone);
}

export function isRequired(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

export function isNumber(value: unknown): boolean {
  return typeof value === "number" && !isNaN(value);
}

export default { isEmail, isURL, isPhone, isRequired, minLength, maxLength, isNumber };

