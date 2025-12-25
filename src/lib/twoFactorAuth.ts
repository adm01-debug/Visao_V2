/**
 * Two-Factor Authentication Manager
 */

export interface TwoFactorConfig {
  issuer: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
}

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

class TwoFactorAuth {
  private config: Required<TwoFactorConfig>;

  constructor(config: TwoFactorConfig) {
    this.config = {
      issuer: config.issuer,
      algorithm: config.algorithm || 'SHA1',
      digits: config.digits || 6,
      period: config.period || 30,
    };
  }

  generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => chars[b % 32]).join('');
  }

  generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const array = new Uint8Array(4);
      crypto.getRandomValues(array);
      const code = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      codes.push(code.toUpperCase());
    }
    return codes;
  }

  getQrCodeUrl(secret: string, accountName: string): string {
    const params = new URLSearchParams({
      secret,
      issuer: this.config.issuer,
      algorithm: this.config.algorithm,
      digits: this.config.digits.toString(),
      period: this.config.period.toString(),
    });
    const otpauth = `otpauth://totp/${encodeURIComponent(this.config.issuer)}:${encodeURIComponent(accountName)}?${params}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
  }

  async setup(accountName: string): Promise<TwoFactorSetup> {
    const secret = this.generateSecret();
    return {
      secret,
      qrCodeUrl: this.getQrCodeUrl(secret, accountName),
      backupCodes: this.generateBackupCodes(),
    };
  }

  // Note: TOTP verification should be done server-side
  // This is a placeholder for client-side token generation display
  getCurrentToken(secret: string): string {
    const time = Math.floor(Date.now() / 1000 / this.config.period);
    // Simplified - real implementation needs HMAC
    const hash = (time * secret.charCodeAt(0)) % 1000000;
    return hash.toString().padStart(6, '0');
  }

  getTimeRemaining(): number {
    return this.config.period - (Math.floor(Date.now() / 1000) % this.config.period);
  }
}

export const createTwoFactorAuth = (config: TwoFactorConfig) => new TwoFactorAuth(config);
export default TwoFactorAuth;
