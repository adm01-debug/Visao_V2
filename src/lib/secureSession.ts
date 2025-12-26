/**
 * Secure Session
 */
export class SecureSession {
  private token: string | null = null;
  private expiresAt: number = 0;
  setToken(token: string, expiresIn: number): void { this.token = token; this.expiresAt = Date.now() + expiresIn * 1000; }
  getToken(): string | null { return this.isValid() ? this.token : null; }
  isValid(): boolean { return !!this.token && Date.now() < this.expiresAt; }
  clear(): void { this.token = null; this.expiresAt = 0; }
  refresh(newToken: string, expiresIn: number): void { this.setToken(newToken, expiresIn); }
}
export const secureSession = new SecureSession();
