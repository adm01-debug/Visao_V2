/**
 * Biometric Authentication
 */
export async function isBiometricAvailable(): Promise<boolean> {
  return typeof PublicKeyCredential !== 'undefined' && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}
export async function registerBiometric(userId: string): Promise<PublicKeyCredential | null> {
  if (!await isBiometricAvailable()) return null;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  return await navigator.credentials.create({ publicKey: { challenge, rp: { name: 'Visao' }, user: { id: new TextEncoder().encode(userId), name: userId, displayName: userId }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' } } }) as PublicKeyCredential;
}
export async function authenticateBiometric(credentialId: ArrayBuffer): Promise<boolean> {
  try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: credentialId }], userVerification: 'required' } }); return true; } catch { return false; }
}
