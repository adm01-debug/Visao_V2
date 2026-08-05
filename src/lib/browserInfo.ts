/**
 * VISÃO — Detecção leve de navegador/OS para telemetria.
 *
 * Não é rastreamento — é rótulo de agrupamento no painel de prévias.
 * Fallback seguro para 'unknown' quando o UA está bloqueado (Brave/Tor).
 */
export interface BrowserInfo {
  browser: string;
  browserVersion: string;
  os: string;
  networkType?: string;
}

function pick(regex: RegExp, ua: string): string | null {
  const m = ua.match(regex);
  return m?.[1] ?? null;
}

/** Prioriza engines mais específicas (Edge/Opera antes de Chrome/Safari). */
export function detectBrowser(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): BrowserInfo {
  const safe = ua || '';
  let browser = 'unknown';
  let browserVersion = '';

  const rules: Array<{ name: string; pattern: RegExp }> = [
    { name: 'Edge', pattern: /Edg(?:e|A|iOS)?\/([\d.]+)/i },
    { name: 'Opera', pattern: /OPR\/([\d.]+)/i },
    { name: 'Samsung', pattern: /SamsungBrowser\/([\d.]+)/i },
    { name: 'Chrome', pattern: /Chrome\/([\d.]+)/i },
    { name: 'Firefox', pattern: /Firefox\/([\d.]+)/i },
    { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/i },
  ];
  for (const r of rules) {
    const v = pick(r.pattern, safe);
    if (v) {
      browser = r.name;
      browserVersion = v;
      break;
    }
  }

  let os = 'unknown';
  if (/Windows NT/i.test(safe)) os = 'Windows';
  else if (/Mac OS X/i.test(safe)) os = 'macOS';
  else if (/Android/i.test(safe)) os = 'Android';
  else if (/(iPhone|iPad|iPod)/i.test(safe)) os = 'iOS';
  else if (/Linux/i.test(safe)) os = 'Linux';

  let networkType: string | undefined;
  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & {
          connection?: { effectiveType?: string };
        })
      : undefined;
  if (nav?.connection?.effectiveType) networkType = nav.connection.effectiveType;

  return { browser, browserVersion, os, networkType };
}

/** Bucket de resolução legível para o painel (2160p/1440p/1080p/720p/480p/other). */
export function resolutionBucket(width?: number | null, height?: number | null): string {
  const h = Number(height ?? 0);
  const w = Number(width ?? 0);
  if (!Number.isFinite(h) || h <= 0) return 'unknown';
  if (h >= 2000) return '2160p';
  if (h >= 1300) return '1440p';
  if (h >= 1000) return '1080p';
  if (h >= 660) return '720p';
  if (h >= 440) return '480p';
  if (w > 0 && h > 0) return `${w}x${h}`;
  return 'other';
}
