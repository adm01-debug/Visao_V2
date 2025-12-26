/**
 * Encrypted Storage
 */
class EncryptedStorage {
  private key: CryptoKey | null = null;
  async init(password: string): Promise<void> {
    const enc = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest('SHA-256', enc);
    this.key = await crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  async setItem(key: string, value: any): Promise<void> {
    if (!this.key) throw new Error('Not initialized');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, new TextEncoder().encode(JSON.stringify(value)));
    localStorage.setItem(key, JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) }));
  }
  async getItem<T>(key: string): Promise<T | null> {
    if (!this.key) throw new Error('Not initialized');
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const { iv, data } = JSON.parse(stored);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, this.key, new Uint8Array(data));
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
}
export const encryptedStorage = new EncryptedStorage();
