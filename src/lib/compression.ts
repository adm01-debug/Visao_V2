/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: compression
 * 
 * Compressão e descompressão de dados usando múltiplos algoritmos
 */

export type CompressionAlgorithm = 'gzip' | 'deflate' | 'lz4' | 'brotli';

export interface CompressionOptions {
  algorithm?: CompressionAlgorithm;
  level?: number; // 1-9
}

export interface CompressionResult {
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: CompressionAlgorithm;
}

/**
 * Comprime dados usando CompressionStream API
 */
export async function compress(
  data: string | ArrayBuffer | Uint8Array,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { algorithm = 'gzip' } = options;
  
  // Converter para Uint8Array
  let inputData: Uint8Array;
  if (typeof data === 'string') {
    inputData = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) {
    inputData = new Uint8Array(data);
  } else {
    inputData = data;
  }

  const originalSize = inputData.length;

  // Usar CompressionStream se disponível
  if ('CompressionStream' in globalThis && (algorithm === 'gzip' || algorithm === 'deflate')) {
    const stream = new CompressionStream(algorithm);
    const writer = stream.writable.getWriter();
    writer.write(inputData);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = stream.readable.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const compressedData = concatenateUint8Arrays(chunks);
    
    return {
      data: compressedData,
      originalSize,
      compressedSize: compressedData.length,
      ratio: compressedData.length / originalSize,
      algorithm,
    };
  }

  // Fallback: usar pako para gzip/deflate
  const pako = await import('pako');
  const compressedData = algorithm === 'deflate' 
    ? pako.deflate(inputData)
    : pako.gzip(inputData);

  return {
    data: compressedData,
    originalSize,
    compressedSize: compressedData.length,
    ratio: compressedData.length / originalSize,
    algorithm,
  };
}

/**
 * Descomprime dados
 */
export async function decompress(
  data: Uint8Array,
  algorithm: CompressionAlgorithm = 'gzip'
): Promise<Uint8Array> {
  // Usar DecompressionStream se disponível
  if ('DecompressionStream' in globalThis && (algorithm === 'gzip' || algorithm === 'deflate')) {
    const stream = new DecompressionStream(algorithm);
    const writer = stream.writable.getWriter();
    writer.write(data);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = stream.readable.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    return concatenateUint8Arrays(chunks);
  }

  // Fallback: usar pako
  const pako = await import('pako');
  return algorithm === 'deflate' 
    ? pako.inflate(data)
    : pako.ungzip(data);
}

/**
 * Comprime string para Base64
 */
export async function compressToBase64(
  data: string,
  options?: CompressionOptions
): Promise<string> {
  const result = await compress(data, options);
  return btoa(String.fromCharCode(...result.data));
}

/**
 * Descomprime de Base64 para string
 */
export async function decompressFromBase64(
  base64: string,
  algorithm?: CompressionAlgorithm
): Promise<string> {
  const binary = atob(base64);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i);
  }
  
  const decompressed = await decompress(data, algorithm);
  return new TextDecoder().decode(decompressed);
}

/**
 * Comprime objeto JSON
 */
export async function compressJSON<T>(
  obj: T,
  options?: CompressionOptions
): Promise<string> {
  const json = JSON.stringify(obj);
  return compressToBase64(json, options);
}

/**
 * Descomprime para objeto JSON
 */
export async function decompressJSON<T>(
  compressed: string,
  algorithm?: CompressionAlgorithm
): Promise<T> {
  const json = await decompressFromBase64(compressed, algorithm);
  return JSON.parse(json);
}

/**
 * Concatena arrays Uint8Array
 */
function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Estima taxa de compressão sem comprimir
 */
export function estimateCompressionRatio(data: string): number {
  const uniqueChars = new Set(data).size;
  const totalChars = data.length;
  const entropy = uniqueChars / 256;
  return Math.max(0.1, Math.min(1, entropy * 0.8));
}

export default {
  compress,
  decompress,
  compressToBase64,
  decompressFromBase64,
  compressJSON,
  decompressJSON,
  estimateCompressionRatio,
};
