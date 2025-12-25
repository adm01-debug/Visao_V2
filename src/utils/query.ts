/**
 * Query String Utilities
 */

export type QueryValue = string | number | boolean | null | undefined | QueryValue[];

export interface QueryParams {
  [key: string]: QueryValue;
}

export const parseQuery = (query: string): Record<string, string | string[]> => {
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  const result: Record<string, string | string[]> = {};
  
  params.forEach((value, key) => {
    if (key in result) {
      const existing = result[key];
      result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      result[key] = value;
    }
  });
  
  return result;
};

export const stringifyQuery = (params: QueryParams): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v !== undefined && v !== null) searchParams.append(key, String(v));
      });
    } else {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
};

export const getQueryParam = (url: string, key: string): string | null => {
  const urlObj = new URL(url, 'http://dummy.com');
  return urlObj.searchParams.get(key);
};

export const setQueryParam = (url: string, key: string, value: string): string => {
  const urlObj = new URL(url, 'http://dummy.com');
  urlObj.searchParams.set(key, value);
  return url.includes('://') ? urlObj.toString() : `${urlObj.pathname}${urlObj.search}`;
};

export const removeQueryParam = (url: string, key: string): string => {
  const urlObj = new URL(url, 'http://dummy.com');
  urlObj.searchParams.delete(key);
  return url.includes('://') ? urlObj.toString() : `${urlObj.pathname}${urlObj.search}`;
};

export const mergeQueryParams = (url: string, params: QueryParams): string => {
  const urlObj = new URL(url, 'http://dummy.com');
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      urlObj.searchParams.delete(key);
    } else if (Array.isArray(value)) {
      urlObj.searchParams.delete(key);
      value.forEach(v => {
        if (v !== undefined && v !== null) urlObj.searchParams.append(key, String(v));
      });
    } else {
      urlObj.searchParams.set(key, String(value));
    }
  });
  return url.includes('://') ? urlObj.toString() : `${urlObj.pathname}${urlObj.search}`;
};

export const hasQueryParam = (url: string, key: string): boolean => {
  const urlObj = new URL(url, 'http://dummy.com');
  return urlObj.searchParams.has(key);
};

export const getQueryParams = (url: string): Record<string, string> => {
  const urlObj = new URL(url, 'http://dummy.com');
  return Object.fromEntries(urlObj.searchParams);
};
