type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
  duration?: number;
  icon?: string;
  onClick?: () => void;
}

class NotificationService {
  private permission: NotificationPermission = 'default';

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  async show(options: NotificationOptions): Promise<void> {
    const { title, message, type = 'info', icon, onClick } = options;

    if (this.permission !== 'granted') {
      await this.requestPermission();
    }

    if (this.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: icon || `/icons/${type}.png`,
        tag: Date.now().toString(),
      });

      if (onClick) notification.onclick = onClick;
    }
  }

  success(title: string, message: string): void {
    this.show({ title, message, type: 'success' });
  }

  error(title: string, message: string): void {
    this.show({ title, message, type: 'error' });
  }

  warning(title: string, message: string): void {
    this.show({ title, message, type: 'warning' });
  }

  info(title: string, message: string): void {
    this.show({ title, message, type: 'info' });
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
