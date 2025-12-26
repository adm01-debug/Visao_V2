/**
 * Key Rotation
 */
export class KeyRotation {
  private keys: Map<string, { key: CryptoKey; createdAt: Date }> = new Map();
  private maxAge = 24 * 60 * 60 * 1000;
  async generateKey(): Promise<string> {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const id = crypto.randomUUID();
    this.keys.set(id, { key, createdAt: new Date() });
    return id;
  }
  getKey(id: string): CryptoKey | null { return this.keys.get(id)?.key || null; }
  rotateExpired(): string[] {
    const expired: string[] = [];
    this.keys.forEach((v, k) => { if (Date.now() - v.createdAt.getTime() > this.maxAge) { expired.push(k); this.keys.delete(k); } });
    return expired;
  }
}
export const keyRotation = new KeyRotation();
