/**
 * VISÃO - Haptic Feedback Utility
 * Provides subtle vibration feedback on compatible devices
 */

export const triggerHaptic = (
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) => {
  if (!('vibrate' in navigator)) return;

  switch (style) {
    case 'light':
      navigator.vibrate(10);
      break;
    case 'medium':
      navigator.vibrate(20);
      break;
    case 'heavy':
      navigator.vibrate(50);
      break;
    case 'success':
      navigator.vibrate([20, 30, 20]);
      break;
    case 'warning':
      navigator.vibrate([50, 50, 50]);
      break;
    case 'error':
      navigator.vibrate([10, 10, 10, 10, 60]);
      break;
    default:
      navigator.vibrate(10);
  }
};
