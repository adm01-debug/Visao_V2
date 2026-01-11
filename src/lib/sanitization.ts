/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks
 * @module lib/sanitization
 */

/**
 * Sanitize HTML string - prevents XSS
 * @param input - Raw HTML string
 * @returns Sanitized string safe for display
 */
export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Sanitize for SQL (parameterized queries preferred)
 * @param input - Raw SQL input
 * @returns Sanitized SQL string
 */
export function sanitizeSql(input: string): string {
  return input.replace(/['";\\]/g, '');
}

/**
 * Sanitize filename - removes dangerous characters
 * @param filename - Raw filename
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

/**
 * Sanitize URL - validates and normalizes
 * @param url - Raw URL string
 * @returns Validated URL or empty string
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize JSON input with fallback
 * @param input - Raw JSON string
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed JSON or default value
 */
export function sanitizeJson<T>(input: string, defaultValue: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Strip all HTML tags from string
 * @param input - HTML string
 * @returns Plain text
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape special HTML characters
 * @param input - Raw string
 * @returns Escaped string
 */
export function escapeSpecialChars(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize email address
 * @param email - Raw email
 * @returns Sanitized email or empty string
 */
export function sanitizeEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Sanitize phone number
 * @param phone - Raw phone number
 * @returns Digits only
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '').slice(0, 20);
}

/**
 * Sanitize object keys recursively
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    
    if (typeof value === 'string') {
      result[sanitizedKey] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      result[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[sanitizedKey] = value;
    }
  }
  
  return result as T;
}

export default {
  sanitizeHtml,
  sanitizeSql,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeJson,
  stripHtml,
  escapeSpecialChars,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject,
};
