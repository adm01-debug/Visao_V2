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
  'image/webp': ['52494646'], // RIFF (needs check for WEBP)
  'application/pdf': ['25504446']
};

/**
 * Lê os primeiros bytes de um arquivo e valida contra assinaturas conhecidas
 */
export async function validateFileSignature(file: File, expectedType: string): Promise<boolean> {
  const signatures = MAGIC_BYTES[expectedType];
  if (!signatures) return true; // Se não temos assinatura definida, permitimos (fallback)

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve(false);
        return;
      }

      const result = e.target.result;
      if (!result) {
        resolve(false);
        return;
      }
      const arr = new Uint8Array(result as ArrayBuffer).subarray(0, 4);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).toUpperCase();
      }

      // Especial para WebP (RIFF....WEBP)
      if (expectedType === 'image/webp') {
        const isRiff = header.startsWith('52494646');
        resolve(isRiff);
        return;
      }

      const isValid = signatures.some(sig => header.startsWith(sig));
      resolve(isValid);
    };
    
    // Lemos apenas os primeiros 8 bytes para performance
    reader.readAsArrayBuffer(file.slice(0, 8));
  });
}
