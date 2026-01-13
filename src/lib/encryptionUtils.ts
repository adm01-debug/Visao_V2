// Encryption utilities
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const generateKey = async (): Promise<CryptoKey> => {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
};

export const encrypt = async (data: string, key: CryptoKey): Promise<{ iv: Uint8Array; encrypted: ArrayBuffer }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(data));
  return { iv, encrypted };
};

export const decrypt = async (encrypted: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> => {
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return decoder.decode(decrypted);
};

export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

export default { generateKey, encrypt, decrypt, exportKey };
