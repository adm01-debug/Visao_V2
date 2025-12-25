/**
 * UUID Utilities
 */

export const uuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const uuidv4 = uuid;

export const shortId = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
};

export const nanoid = (size = 21): string => {
  const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
  let id = '';
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) {
    id += urlAlphabet[bytes[i] & 63];
  }
  return id;
};

export const isUuid = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

export const isUuidv4 = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

export const parseUuid = (str: string): { version: number; variant: string } | null => {
  if (!isUuid(str)) return null;
  const version = parseInt(str.charAt(14), 16);
  const variant = parseInt(str.charAt(19), 16);
  return {
    version,
    variant: variant < 8 ? 'NCS' : variant < 12 ? 'RFC4122' : variant < 14 ? 'Microsoft' : 'Future',
  };
};

export const uuidToBuffer = (id: string): Uint8Array => {
  const hex = id.replace(/-/g, '');
  const buffer = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    buffer[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return buffer;
};

export const bufferToUuid = (buffer: Uint8Array): string => {
  const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const uuidToBase64 = (id: string): string => {
  const buffer = uuidToBuffer(id);
  return btoa(String.fromCharCode(...buffer));
};

export const base64ToUuid = (base64: string): string => {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return bufferToUuid(buffer);
};

export const nilUuid = '00000000-0000-0000-0000-000000000000';

export const isNilUuid = (id: string): boolean => id === nilUuid;

export const maxUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

export const compareUuids = (a: string, b: string): number =>
  a.toLowerCase().localeCompare(b.toLowerCase());

export const sortUuids = (uuids: string[]): string[] =>
  [...uuids].sort(compareUuids);
