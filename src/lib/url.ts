/**
 * URL utilities - Re-exports from @/utils/url
 * src/utils/url is the source of truth
 */

export {
  isAbsoluteUrl,
  isRelativeUrl,
  joinUrl,
  getBasename,
  getDirname,
  getExtension,
  removeExtension,
  getOrigin,
  getHostname,
  getProtocol,
  getPort,
  getPathname,
  getHash,
  setHash,
  removeHash,
  parseUrl,
  isValidUrl,
  normalizeUrl,
  encodeUrlComponent,
  decodeUrlComponent,
  isSameOrigin,
} from '@/utils/url';

import {
  parseUrl as _parseUrl,
  isValidUrl as _isValidUrl,
  getPathname,
  getOrigin,
} from '@/utils/url';

// Legacy aliases for backward compatibility
export const parseURL = _parseUrl;
export const isValidURL = _isValidUrl;

export function buildURL(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export function getQueryParams(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export default {
  parseURL: _parseUrl,
  buildURL,
  getQueryParams,
  isValidURL: _isValidUrl,
  parseUrl: _parseUrl,
  isValidUrl: _isValidUrl,
  getPathname,
  getOrigin,
};
