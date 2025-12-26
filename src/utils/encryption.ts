/**
 * Encryption Utility
 */
const ALGO = 'AES-GCM';
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGO, length: 256 }, true, ['encrypt', 'decrypt']);
}
export async function encrypt(data: string, key: CryptoKey): Promise<{ iv: Uint8Array; encrypted: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: ALGO, iv }, key, new TextEncoder().encode(data));
  return { iv, encrypted };
}
export async function decrypt(encrypted: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
  const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}
export async function hash(data: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
