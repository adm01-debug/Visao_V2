/**
 * VISÃO - Utilitários de validação de arquivos via Magic Bytes
 * Proteção contra arquivos disfarçados e execução remota de código (RCE)
 */

interface MagicBytes {
  [key: string]: string[];
}

const MAGIC_BYTES: MagicBytes = {
  'image/jpeg': ['FFD8FF'],
  'image/png': ['89504E47'],
  'image/gif': ['47494638'],
  'image/webp': ['52494646'],
  'application/pdf': ['25504446'],
};

/**
 * Lê os primeiros bytes de um arquivo e valida contra assinaturas conhecidas
 */
export async function validateFileSignature(file: File, expectedType: string): Promise<boolean> {
  const signatures = MAGIC_BYTES[expectedType];
  if (!signatures) return true;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (!(result instanceof ArrayBuffer)) {
        resolve(false);
        return;
      }

      const arr = new Uint8Array(result).subarray(0, 4);
      let header = '';
      for (const byte of arr) {
        const hex = byte.toString(16).toUpperCase();
        header += hex.padStart(2, '0');
      }

      if (expectedType === 'image/webp') {
        resolve(header.startsWith('52494646'));
        return;
      }

      const isValid = signatures.some((sig) => header.startsWith(sig));
      resolve(isValid);
    };

    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 8));
  });
}
