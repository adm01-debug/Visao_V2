/**
 * Device Fingerprint
 */
export async function generateFingerprint(): Promise<string> {
  const components = [navigator.userAgent, navigator.language, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency, navigator.deviceMemory || 0];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) { ctx.textBaseline = 'top'; ctx.font = '14px Arial'; ctx.fillText('fingerprint', 2, 2); components.push(canvas.toDataURL()); }
  const data = components.join('|');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
