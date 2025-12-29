/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Crypto Utilities - Funções criptográficas
 * 
 * @module utils/crypto
 */

// ============================================
// GERAÇÃO DE VALORES ALEATÓRIOS
// ============================================

/**
 * Gerar UUID v4
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Gerar bytes aleatórios
 * @param length Número de bytes
 */
export const generateRandomBytes = (length: number): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(length));
};

/**
 * Gerar string hexadecimal aleatória
 * @param length Tamanho da string
 */
export const generateRandomString = (length: number): string => {
  const bytes = generateRandomBytes(Math.ceil(length / 2));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
};

/**
 * Gerar token de autenticação
 * @param length Tamanho do token (padrão: 32)
 */
export const generateToken = (length = 32): string => {
  return generateRandomString(length);
};

/**
 * Gerar número inteiro aleatório
 * @param min Mínimo (inclusivo)
 * @param max Máximo (exclusivo)
 */
export const randomInt = (min: number, max: number): number => {
  const range = max - min;
  const bytes = generateRandomBytes(4);
  const value = new DataView(bytes.buffer).getUint32(0);
  return min + (value % range);
};

// ============================================
// HASHING
// ============================================

/**
 * Hash SHA-256
 * @param data Dados a serem hasheados
 */
export const hashSHA256 = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Hash SHA-512
 * @param data Dados a serem hasheados
 */
export const hashSHA512 = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-512', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Hash MD5-like (truncado de SHA-256)
 * @param data Dados a serem hasheados
 * @deprecated Usar hashSHA256 para melhor segurança
 */
export const hashMD5 = async (data: string): Promise<string> => {
  const sha256 = await hashSHA256(data);
  return sha256.slice(0, 32);
};

// ============================================
// BASE64
// ============================================

/**
 * Codificar string em Base64
 * @param str String a codificar
 */
export const base64Encode = (str: string): string => {
  const encoded = encodeURIComponent(str).replace(
    /%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(encoded);
};

/**
 * Decodificar Base64 para string
 * @param str String Base64
 */
export const base64Decode = (str: string): string => {
  const decoded = atob(str);
  return decodeURIComponent(
    Array.from(decoded)
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
};

/**
 * Codificar ArrayBuffer em Base64
 * @param buffer ArrayBuffer a codificar
 */
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

/**
 * Decodificar Base64 para ArrayBuffer
 * @param base64 String Base64
 */
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// ============================================
// HMAC
// ============================================

/**
 * Gerar HMAC-SHA256
 * @param key Chave secreta
 * @param data Dados a assinar
 */
export const hmacSHA256 = async (key: string, data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// ============================================
// COMPARAÇÃO SEGURA
// ============================================

/**
 * Comparar strings em tempo constante
 * Previne timing attacks
 */
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  generateUUID,
  generateRandomBytes,
  generateRandomString,
  generateToken,
  randomInt,
  hashSHA256,
  hashSHA512,
  hashMD5,
  base64Encode,
  base64Decode,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  hmacSHA256,
  secureCompare,
};
