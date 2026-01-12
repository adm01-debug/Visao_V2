/**
 * Notification Utilities
 * @module lib/notificationUtils
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (Notification.permission !== 'granted') return null;
  return new Notification(title, { icon: '/favicon.ico', badge: '/favicon.ico', ...options });
}

export function playAlertSound(type: 'alert' | 'warning' | 'success' = 'alert'): void {
  const frequencies: Record<typeof type, number[]> = {
    alert: [880, 660], warning: [440, 550], success: [523, 659, 784]
  };
  try {
    const ctx = new AudioContext();
    frequencies[type].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.1);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.1);
    });
  } catch {}
}

export function vibrate(pattern: number | number[] = 200): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

export default { requestNotificationPermission, showBrowserNotification, playAlertSound, vibrate };
