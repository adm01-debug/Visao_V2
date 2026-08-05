/**
 * Input Sanitization Utilities - VISÃO
 * Protege o sistema contra ataques de XSS e injeção.
 */

/**
 * Sanitiza uma string para exibição segura como texto
 */
export function sanitizeHtml(input: string): string {
  if (typeof window === 'undefined') return input;
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Sanitiza uma string para uso em SQL (prefira sempre queries parametrizadas)
 */
export function sanitizeSql(input: string): string {
  return input.replace(/['";\\]/g, '');
}

/**
 * Sanitiza nomes de arquivos para evitar Directory Traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

/**
 * Valida e sanitiza uma URL
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
 * Tenta parsear JSON de forma segura
 */
export function sanitizeJson<T>(input: string, defaultValue: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Remove tags HTML de uma string
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escapa caracteres especiais para HTML
 */
export function escapeSpecialChars(input: string): string {
  return (
    input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      // color-exception -- '&#039;' is the HTML entity for a single quote, not a color
      .replace(/'/g, /* color-exception */ '&#039;')
  );
}

export default {
  sanitizeHtml,
  sanitizeSql,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeJson,
  stripHtml,
  escapeSpecialChars,
};
