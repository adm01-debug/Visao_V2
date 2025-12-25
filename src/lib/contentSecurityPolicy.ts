/**
 * Content Security Policy Builder
 */

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'worker-src'?: string[];
  'child-src'?: string[];
  'form-action'?: string[];
  'base-uri'?: string[];
  'manifest-src'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

const DEFAULT_CSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https:', 'wss:'],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': true,
};

export function buildCSP(directives: CSPDirectives = {}): string {
  const merged = { ...DEFAULT_CSP, ...directives };
  const parts: string[] = [];

  for (const [key, value] of Object.entries(merged)) {
    if (value === true) {
      parts.push(key);
    } else if (value === false) {
      continue;
    } else if (Array.isArray(value) && value.length > 0) {
      parts.push(`${key} ${value.join(' ')}`);
    }
  }

  return parts.join('; ');
}

export function getCSPMeta(directives: CSPDirectives = {}): string {
  return `<meta http-equiv="Content-Security-Policy" content="${buildCSP(directives)}">`;
}

export function applyCSP(directives: CSPDirectives = {}): void {
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existing) existing.remove();

  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = buildCSP(directives);
  document.head.appendChild(meta);
}

export const CSP_PRESETS = {
  strict: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'upgrade-insecure-requests': true,
  },
  relaxed: {
    'default-src': ["'self'", 'https:'],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
    'style-src': ["'self'", "'unsafe-inline'", 'https:'],
    'img-src': ['*', 'data:', 'blob:'],
    'connect-src': ['*'],
  },
  videoStreaming: {
    'default-src': ["'self'"],
    'media-src': ["'self'", 'blob:', 'https:', 'wss:'],
    'connect-src': ["'self'", 'https:', 'wss:'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  },
} as const;

export default { buildCSP, getCSPMeta, applyCSP, CSP_PRESETS };
