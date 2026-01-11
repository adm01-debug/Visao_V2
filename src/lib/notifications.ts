/**
 * Notifications utilities
 */

export async function requestPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

export function isSupported(): boolean {
  return "Notification" in window;
}

export function getPermission(): NotificationPermission {
  return Notification.permission;
}

export function show(title: string, options?: NotificationOptions): Notification | null {
  if (getPermission() !== "granted") return null;
  return new Notification(title, options);
}

export async function showIfPermitted(title: string, options?: NotificationOptions): Promise<Notification | null> {
  if (getPermission() === "default") {
    await requestPermission();
  }
  return show(title, options);
}

export default { requestPermission, isSupported, getPermission, show, showIfPermitted };

