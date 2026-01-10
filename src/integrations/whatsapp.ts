/**
 * WhatsApp Business API Integration
 * Handles messaging through WhatsApp Cloud API
 */

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken?: string;
  apiVersion?: string;
}

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'image' | 'document' | 'template' | 'interactive';
  content: TextContent | MediaContent | TemplateContent | InteractiveContent;
}

export interface TextContent {
  body: string;
  previewUrl?: boolean;
}

export interface MediaContent {
  link?: string;
  id?: string;
  caption?: string;
  filename?: string;
}

export interface TemplateContent {
  name: string;
  language: { code: string };
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: TemplateParameter[];
  sub_type?: 'quick_reply' | 'url';
  index?: number;
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename: string };
  video?: { link: string };
}

export interface InteractiveContent {
  type: 'button' | 'list' | 'product' | 'product_list';
  header?: { type: 'text' | 'image'; text?: string; image?: { link: string } };
  body: { text: string };
  footer?: { text: string };
  action: InteractiveAction;
}

export interface InteractiveAction {
  buttons?: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
  button?: string;
  sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
}

export interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; filename: string };
  button?: { text: string; payload: string };
  interactive?: { type: string; button_reply?: { id: string; title: string } };
}

export interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private baseUrl = 'https://graph.facebook.com';
  private apiVersion = 'v18.0';

  /**
   * Initialize the service
   */
  initialize(config: WhatsAppConfig): void {
    this.config = config;
    if (config.apiVersion) {
      this.apiVersion = config.apiVersion;
    }
      }

  /**
   * Get API URL
   */
  private get apiUrl(): string {
    return `${this.baseUrl}/${this.apiVersion}/${this.config?.phoneNumberId}`;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: unknown
  ): Promise<T> {
    if (!this.config) {
      throw new Error('WhatsApp service not initialized');
    }

    const response = await fetch(`${this.apiUrl}/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'WhatsApp API error');
    }

    return response.json();
  }

  /**
   * Send text message
   */
  async sendText(to: string, text: string, previewUrl = false): Promise<WhatsAppResponse> {
    return this.request<WhatsAppResponse>('messages', 'POST', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        body: text,
        preview_url: previewUrl,
      },
    });
  }

  /**
   * Send image
   */
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<WhatsAppResponse> {
    return this.request<WhatsAppResponse>('messages', 'POST', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    });
  }

  /**
   * Send document
   */
  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<WhatsAppResponse> {
    return this.request<WhatsAppResponse>('messages', 'POST', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        caption,
      },
    });
  }

  /**
   * Send template message
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: TemplateComponent[]
  ): Promise<WhatsAppResponse> {
    return this.request<WhatsAppResponse>('messages', 'POST', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    });
  }

  /**
   * Send interactive buttons
   */
  async sendButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppResponse> {
    return this.request<WhatsAppResponse>('messages', 'POST', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    });
  }

  /**
   * Send interactive list
   */
  async sendList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppResponse> {
    return this.request<WhatsAppResponse>('messages', 'POST', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          button: buttonText,
          sections,
        },
      },
    });
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(
    to: string,
    alertType: string,
    cameraName: string,
    timestamp: Date,
    imageUrl?: string
  ): Promise<WhatsAppResponse> {
    const formattedTime = timestamp.toLocaleString('pt-BR');
    
    if (imageUrl) {
      return this.sendImage(
        to,
        imageUrl,
        `🚨 *ALERTA: ${alertType}*\n📹 Câmera: ${cameraName}\n🕐 Data/Hora: ${formattedTime}`
      );
    }

    return this.sendText(
      to,
      `🚨 *ALERTA: ${alertType}*\n\n📹 Câmera: ${cameraName}\n🕐 Data/Hora: ${formattedTime}\n\nVerifique o sistema VISÃO para mais detalhes.`
    );
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.request('messages', 'POST', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  /**
   * Verify webhook
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (!this.config?.webhookVerifyToken) {
      return null;
    }

    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }

    return null;
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: unknown): {
    messages: WebhookMessage[];
    statuses: WebhookStatus[];
  } {
    const result: { messages: WebhookMessage[]; statuses: WebhookStatus[] } = {
      messages: [],
      statuses: [],
    };

    const data = payload as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: WebhookMessage[];
            statuses?: WebhookStatus[];
          };
        }>;
      }>;
    };

    data.entry?.forEach((entry) => {
      entry.changes?.forEach((change) => {
        if (change.value?.messages) {
          result.messages.push(...change.value.messages);
        }
        if (change.value?.statuses) {
          result.statuses.push(...change.value.statuses);
        }
      });
    });

    return result;
  }

  /**
   * Get media URL
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${this.apiVersion}/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${this.config?.accessToken}`,
      },
    });

    const data = await response.json();
    return data.url;
  }

  /**
   * Download media
   */
  async downloadMedia(mediaUrl: string): Promise<Blob> {
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${this.config?.accessToken}`,
      },
    });

    return response.blob();
  }

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this.config !== null;
  }
}

// Singleton instance
export const whatsappService = new WhatsAppService();

export default WhatsAppService;
