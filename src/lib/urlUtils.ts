/**
 * URL Utilities
 * @module lib/urlUtils
 */

export function getQueryParams(url: string = window.location.href): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URL(url).searchParams;
  searchParams.forEach((value, key) => { params[key] = value; });
  return params;
}

export function buildUrl(base: string, params: Record<string, string | number | boolean>): string {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getUrlParts(url: string): {
  protocol: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
} {
  const parsed = new URL(url);
  return {
    protocol: parsed.protocol,
    host: parsed.host,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
  };
}

export function joinPaths(...paths: string[]): string {
  return paths
    .map((part, i) => {
      if (i === 0) return part.replace(/\/+$/, '');
      return part.replace(/^\/+|\/+$/g, '');
    })
    .filter(Boolean)
    .join('/');
}

export default { getQueryParams, buildUrl, isValidUrl, getUrlParts, joinPaths };
