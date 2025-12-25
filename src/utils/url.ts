/**
 * URL Utilities
 */

export const isAbsoluteUrl = (url: string): boolean =>
  /^https?:\/\//i.test(url) || url.startsWith('//');

export const isRelativeUrl = (url: string): boolean =>
  !isAbsoluteUrl(url);

export const joinUrl = (...parts: string[]): string =>
  parts.map((part, i) => {
    if (i === 0) return part.replace(/\/+$/, '');
    if (i === parts.length - 1) return part.replace(/^\/+/, '');
    return part.replace(/^\/+/, '').replace(/\/+$/, '');
  }).filter(Boolean).join('/');

export const getBasename = (url: string): string => {
  const path = new URL(url, 'http://dummy.com').pathname;
  return path.split('/').pop() || '';
};

export const getDirname = (url: string): string => {
  const path = new URL(url, 'http://dummy.com').pathname;
  return path.substring(0, path.lastIndexOf('/'));
};

export const getExtension = (url: string): string => {
  const basename = getBasename(url);
  const dotIndex = basename.lastIndexOf('.');
  return dotIndex >= 0 ? basename.substring(dotIndex + 1) : '';
};

export const removeExtension = (url: string): string => {
  const ext = getExtension(url);
  return ext ? url.slice(0, -(ext.length + 1)) : url;
};

export const getOrigin = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
};

export const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

export const getProtocol = (url: string): string => {
  try {
    return new URL(url).protocol.replace(':', '');
  } catch {
    return '';
  }
};

export const getPort = (url: string): string => {
  try {
    return new URL(url).port;
  } catch {
    return '';
  }
};

export const getPathname = (url: string): string => {
  try {
    return new URL(url, 'http://dummy.com').pathname;
  } catch {
    return '';
  }
};

export const getHash = (url: string): string => {
  try {
    return new URL(url, 'http://dummy.com').hash.slice(1);
  } catch {
    return '';
  }
};

export const setHash = (url: string, hash: string): string => {
  try {
    const urlObj = new URL(url);
    urlObj.hash = hash;
    return urlObj.toString();
  } catch {
    return `${url}#${hash}`;
  }
};

export const removeHash = (url: string): string =>
  url.split('#')[0];

export const parseUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    try {
      return new URL(url, window.location.origin);
    } catch {
      return null;
    }
  }
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    return urlObj.toString();
  } catch {
    return url;
  }
};

export const encodeUrlComponent = (str: string): string =>
  encodeURIComponent(str);

export const decodeUrlComponent = (str: string): string =>
  decodeURIComponent(str);

export const isSameOrigin = (url1: string, url2: string): boolean =>
  getOrigin(url1) === getOrigin(url2);
