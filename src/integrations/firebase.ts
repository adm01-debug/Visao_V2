/**
 * Firebase Cloud Messaging Integration
 * Push notifications for web and mobile
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  vapidKey: string;
  serverKey?: string; // For server-side sending
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface TopicSubscription {
  topic: string;
  tokens: string[];
}

export interface NotificationResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  failureCount?: number;
  successCount?: number;
}

type NotificationHandler = (payload: PushNotification & { data?: Record<string, string> }) => void;
type TokenHandler = (token: string) => void;

class FirebaseService {
  private config: FirebaseConfig | null = null;
  private messaging: unknown = null;
  private currentToken: string | null = null;
  private onMessageCallback?: NotificationHandler;
  private onTokenRefreshCallback?: TokenHandler;
  private isInitialized = false;

  /**
   * Initialize Firebase
   */
  async initialize(config: FirebaseConfig): Promise<boolean> {
    this.config = config;

    try {
      // Dynamic import of Firebase
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getMessaging, getToken, onMessage, isSupported } = await import('firebase/messaging');

      // Check if messaging is supported
      const supported = await isSupported();
      if (!supported) {
        console.warn('[Firebase] Messaging not supported in this browser');
        return false;
      }

      // Initialize or get existing app
      const firebaseConfig = {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        measurementId: config.measurementId,
      };

      const app = getApps().length === 0 
        ? initializeApp(firebaseConfig)
        : getApp();

      this.messaging = getMessaging(app);
      this.isInitialized = true;
      
      console.log('[Firebase] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Firebase] Initialization error:', error);
      return false;
    }
  }

  /**
   * Request notification permission and get token
   */
  async requestPermission(): Promise<string | null> {
    if (!this.isInitialized || !this.messaging || !this.config) {
      throw new Error('Firebase not initialized');
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('[Firebase] Notification permission denied');
        return null;
      }

      const { getToken } = await import('firebase/messaging');
      
      const token = await getToken(this.messaging as never, {
        vapidKey: this.config.vapidKey,
      });

      if (token) {
        this.currentToken = token;
        console.log('[Firebase] Token obtained');
        return token;
      }

      console.warn('[Firebase] No token available');
      return null;
    } catch (error) {
      console.error('[Firebase] Permission error:', error);
      return null;
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Listen for foreground messages
   */
  async onForegroundMessage(callback: NotificationHandler): Promise<() => void> {
    if (!this.isInitialized || !this.messaging) {
      throw new Error('Firebase not initialized');
    }

    this.onMessageCallback = callback;
    
    const { onMessage } = await import('firebase/messaging');
    
    return onMessage(this.messaging as never, (payload) => {
      const notification: PushNotification & { data?: Record<string, string> } = {
        title: payload.notification?.title || '',
        body: payload.notification?.body || '',
        icon: payload.notification?.icon,
        image: payload.notification?.image,
        data: payload.data,
      };
      
      this.onMessageCallback?.(notification);
    });
  }

  /**
   * Send notification to token (server-side)
   */
  async sendToToken(
    token: string,
    notification: PushNotification
  ): Promise<NotificationResponse> {
    if (!this.config?.serverKey) {
      return { success: false, error: 'Server key not configured' };
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.config.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            image: notification.image,
            badge: notification.badge,
            tag: notification.tag,
            click_action: notification.data?.url,
          },
          data: notification.data,
          webpush: {
            notification: {
              requireInteraction: notification.requireInteraction,
              silent: notification.silent,
              vibrate: notification.vibrate,
              actions: notification.actions,
            },
          },
        }),
      });

      const data = await response.json();

      if (data.success === 1) {
        return { success: true, messageId: data.results?.[0]?.message_id };
      }

      return { 
        success: false, 
        error: data.results?.[0]?.error || 'FCM send failed' 
      };
    } catch (error) {
      console.error('[Firebase] Send error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send notification to multiple tokens
   */
  async sendToTokens(
    tokens: string[],
    notification: PushNotification
  ): Promise<NotificationResponse> {
    if (!this.config?.serverKey) {
      return { success: false, error: 'Server key not configured' };
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.config.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_ids: tokens,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            image: notification.image,
          },
          data: notification.data,
        }),
      });

      const data = await response.json();

      return {
        success: data.failure === 0,
        successCount: data.success,
        failureCount: data.failure,
      };
    } catch (error) {
      console.error('[Firebase] Bulk send error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send notification to topic
   */
  async sendToTopic(
    topic: string,
    notification: PushNotification
  ): Promise<NotificationResponse> {
    if (!this.config?.serverKey) {
      return { success: false, error: 'Server key not configured' };
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.config.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: `/topics/${topic}`,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            image: notification.image,
          },
          data: notification.data,
        }),
      });

      const data = await response.json();

      if (data.message_id) {
        return { success: true, messageId: data.message_id };
      }

      return { success: false, error: data.error || 'Topic send failed' };
    } catch (error) {
      console.error('[Firebase] Topic send error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Subscribe token to topic
   */
  async subscribeToTopic(topic: string, token?: string): Promise<boolean> {
    const targetToken = token || this.currentToken;
    if (!targetToken || !this.config?.serverKey) {
      return false;
    }

    try {
      const response = await fetch(
        `https://iid.googleapis.com/iid/v1/${targetToken}/rel/topics/${topic}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `key=${this.config.serverKey}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('[Firebase] Subscribe error:', error);
      return false;
    }
  }

  /**
   * Unsubscribe token from topic
   */
  async unsubscribeFromTopic(topic: string, token?: string): Promise<boolean> {
    const targetToken = token || this.currentToken;
    if (!targetToken || !this.config?.serverKey) {
      return false;
    }

    try {
      const response = await fetch(
        `https://iid.googleapis.com/iid/v1:batchRemove`,
        {
          method: 'POST',
          headers: {
            'Authorization': `key=${this.config.serverKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: `/topics/${topic}`,
            registration_tokens: [targetToken],
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('[Firebase] Unsubscribe error:', error);
      return false;
    }
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(
    tokens: string[],
    alertType: string,
    cameraName: string,
    timestamp: Date,
    imageUrl?: string,
    detailsUrl?: string
  ): Promise<NotificationResponse> {
    return this.sendToTokens(tokens, {
      title: `🚨 Alerta: ${alertType}`,
      body: `Câmera: ${cameraName}\nHora: ${timestamp.toLocaleTimeString('pt-BR')}`,
      icon: '/icons/icon-192x192.png',
      image: imageUrl,
      tag: `alert-${Date.now()}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        type: 'alert',
        alertType,
        camera: cameraName,
        timestamp: timestamp.toISOString(),
        url: detailsUrl || '/alerts',
      },
      actions: [
        { action: 'view', title: 'Ver Detalhes' },
        { action: 'dismiss', title: 'Dispensar' },
      ],
    });
  }

  /**
   * Check if notifications are supported
   */
  get isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Check permission status
   */
  get permissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Check if service is ready
   */
  get isReady(): boolean {
    return this.isInitialized && this.currentToken !== null;
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();

export default FirebaseService;
