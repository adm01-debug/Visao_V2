/**
 * Encryption utilities - Re-exports from @/utils/encryption
 */

export {
  generateKey,
  encryptWithKey,
  decryptWithKey,
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
} from '@/utils/encryption';

export type {
  EncryptionAlgorithm,
  HashAlgorithm,
  EncryptionResult,
  KeyPair,
  SimpleEncryptResult,
} from '@/utils/encryption';

import encryptionUtils from '@/utils/encryption';
export default encryptionUtils;
