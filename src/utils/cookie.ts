/**
 * Cookie utilities
 * @module utils/cookie
 */

export function get(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function set(name: string, value: string, days = 7, options?: {
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=${options?.path || '/'}`;
  
  if (options?.domain) cookieString += `; domain=${options.domain}`;
  if (options?.secure) cookieString += '; secure';
  if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`;
  
  document.cookie = cookieString;
}

export function remove(name: string, path = '/'): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

export function getAll(): Record<string, string> {
  return document.cookie.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key) acc[key] = decodeURIComponent(value || '');
    return acc;
  }, {} as Record<string, string>);
}

export function has(name: string): boolean {
  return get(name) !== null;
}

export function clear(): void {
  const cookies = getAll();
  Object.keys(cookies).forEach(name => remove(name));
}

export const cookie = {
  get,
  set,
  remove,
  getAll,
  has,
  clear,
};

export default cookie;
