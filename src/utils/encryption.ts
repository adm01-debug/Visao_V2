/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: encryption
 *
 * Criptografia avançada usando Web Crypto API
 */

export type EncryptionAlgorithm = 'AES-GCM' | 'AES-CBC' | 'RSA-OAEP';
export type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  salt?: string;
  algorithm: EncryptionAlgorithm;
}

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SimpleEncryptResult {
  iv: Uint8Array;
  encrypted: ArrayBuffer;
}

// ============================================
// SIMPLE API (Legacy compatibility)
// ============================================

const ALGO = 'AES-GCM';

/**
 * Gera chave AES simples
 */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGO, length: 256 }, true, ['encrypt', 'decrypt']);
}

/**
 * Criptografa dados com chave (API simples)
 */
export async function encryptWithKey(
  data: string,
  key: CryptoKey
): Promise<SimpleEncryptResult> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    new TextEncoder().encode(data)
  );
  return { iv, encrypted };
}

/**
 * Descriptografa dados com chave (API simples)
 */
export async function decryptWithKey(
  encrypted: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv: iv as BufferSource }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

// ============================================
// ADVANCED API
// ============================================

/**
 * Gera chave AES a partir de senha
 */
export async function deriveKey(
  password: string,
  salt?: Uint8Array,
  iterations = 100000
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const usedSalt = salt || crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: usedSalt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt: usedSalt };
}

/**
 * Criptografa dados com senha (AES-GCM)
 */
export async function encrypt(
  data: string,
  password: string
): Promise<EncryptionResult> {
  const { key, salt } = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(data)
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    algorithm: 'AES-GCM',
  };
}

/**
 * Descriptografa dados com senha (AES-GCM)
 */
export async function decrypt(
  encrypted: EncryptionResult,
  password: string
): Promise<string> {
  const salt = base64ToArrayBuffer(encrypted.salt!);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);

  const { key } = await deriveKey(password, new Uint8Array(salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Gera par de chaves RSA
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return keyPair;
}

/**
 * Exporta chave pública para PEM
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  const b64 = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
}

/**
 * Gera hash de dados (base64)
 */
export async function hash(
  data: string,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(algorithm, enc.encode(data));
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Gera hash hexadecimal
 */
export async function hashHex(
  data: string,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(algorithm, enc.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera bytes aleatórios
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Gera UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Gera token seguro
 */
export function generateToken(length = 32): string {
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Converte ArrayBuffer para Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converte Base64 para ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ============================================
// JSON ENCRYPTION
// ============================================

/**
 * Criptografa objeto JSON
 */
export async function encryptJSON<T>(obj: T, password: string): Promise<string> {
  const json = JSON.stringify(obj);
  const encrypted = await encrypt(json, password);
  return btoa(JSON.stringify(encrypted));
}

/**
 * Descriptografa para objeto JSON
 */
export async function decryptJSON<T>(data: string, password: string): Promise<T> {
  const encrypted = JSON.parse(atob(data)) as EncryptionResult;
  const json = await decrypt(encrypted, password);
  return JSON.parse(json);
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  // Simple API
  generateKey,
  encryptWithKey,
  decryptWithKey,
  // Advanced API
  encrypt,
  decrypt,
  deriveKey,
  generateKeyPair,
  exportPublicKey,
  hash,
  hashHex,
  randomBytes,
  generateUUID,
  generateToken,
  encryptJSON,
  decryptJSON,
};
