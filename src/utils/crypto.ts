export const generateUUID = (): string => crypto.randomUUID();
export const generateRandomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length));
export const generateRandomString = (length: number): string => Array.from(generateRandomBytes(length), b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
export const generateToken = (length = 32): string => generateRandomString(length);

export const hashSHA256 = async (data: string): Promise<string> => { const encoder = new TextEncoder(); const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data)); return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''); };
export const hashMD5 = async (data: string): Promise<string> => hashSHA256(data).then(h => h.slice(0, 32));

export const base64Encode = (str: string): string => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
export const base64Decode = (str: string): string => decodeURIComponent(Array.from(atob(str)).map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
