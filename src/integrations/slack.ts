/**
 * Slack Integration Service
 * Handles messaging through Slack webhooks and API
 */

export interface SlackConfig {
  webhookUrl?: string;
  botToken?: string;
  signingSecret?: string;
  defaultChannel?: string;
}

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  channel?: string;
  thread_ts?: string;
  mrkdwn?: boolean;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'image' | 'actions' | 'context';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  accessory?: SlackAccessory;
  elements?: SlackElement[];
  image_url?: string;
  alt_text?: string;
  block_id?: string;
}

export interface SlackAccessory {
  type: 'button' | 'image' | 'overflow' | 'datepicker' | 'static_select';
  text?: { type: 'plain_text'; text: string; emoji?: boolean };
  action_id?: string;
  url?: string;
  value?: string;
  style?: 'primary' | 'danger';
  image_url?: string;
  alt_text?: string;
}

export interface SlackElement {
  type: 'button' | 'image' | 'static_select' | 'overflow' | 'mrkdwn' | 'plain_text';
  text?: string | { type: 'plain_text' | 'mrkdwn'; text: string };
  action_id?: string;
  url?: string;
  value?: string;
  style?: 'primary' | 'danger';
  image_url?: string;
  alt_text?: string;
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface SlackResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  message?: unknown;
  error?: string;
}

class SlackService {
  private config: SlackConfig | null = null;
  private baseUrl = 'https://slack.com/api';

  /**
   * Initialize the service
   */
  initialize(config: SlackConfig): void {
    this.config = config;
      }

  /**
   * Send message via webhook
   */
  async sendWebhook(message: SlackMessage): Promise<boolean> {
    if (!this.config?.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (error) {
            return false;
    }
  }

  /**
   * Send message via API
   */
  async sendMessage(message: SlackMessage): Promise<SlackResponse> {
    if (!this.config?.botToken) {
      throw new Error('Bot token not configured');
    }

    const channel = message.channel || this.config.defaultChannel;
    if (!channel) {
      throw new Error('Channel not specified');
    }

    const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        ...message,
      }),
    });

    return response.json();
  }

  /**
   * Update existing message
   */
  async updateMessage(
    channel: string,
    ts: string,
    message: Omit<SlackMessage, 'channel'>
  ): Promise<SlackResponse> {
    if (!this.config?.botToken) {
      throw new Error('Bot token not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat.update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        ts,
        ...message,
      }),
    });

    return response.json();
  }

  /**
   * Delete message
   */
  async deleteMessage(channel: string, ts: string): Promise<SlackResponse> {
    if (!this.config?.botToken) {
      throw new Error('Bot token not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat.delete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, ts }),
    });

    return response.json();
  }

  /**
   * Upload file
   */
  async uploadFile(
    channels: string,
    file: Blob,
    filename: string,
    title?: string,
    initialComment?: string
  ): Promise<SlackResponse> {
    if (!this.config?.botToken) {
      throw new Error('Bot token not configured');
    }

    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('channels', channels);
    if (title) formData.append('title', title);
    if (initialComment) formData.append('initial_comment', initialComment);

    const response = await fetch(`${this.baseUrl}/files.upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.botToken}`,
      },
      body: formData,
    });

    return response.json();
  }

  /**
   * Send alert notification
   */
  async sendAlert(
    alertType: string,
    cameraName: string,
    timestamp: Date,
    imageUrl?: string,
    detailsUrl?: string
  ): Promise<boolean> {
    const formattedTime = timestamp.toLocaleString('pt-BR');
    
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 Alerta: ${alertType}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Câmera:* ${cameraName}\n*Data/Hora:* ${formattedTime}`,
        },
      },
    ];

    if (imageUrl) {
      blocks.push({
        type: 'image',
        image_url: imageUrl,
        alt_text: 'Snapshot do alerta',
      });
    }

    if (detailsUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Ver Detalhes', emoji: true },
            url: detailsUrl,
            style: 'primary',
          },
        ],
      });
    }

    blocks.push({ type: 'divider' });

    return this.sendWebhook({
      blocks,
      text: `Alerta: ${alertType} - ${cameraName}`,
    });
  }

  /**
   * Send system status update
   */
  async sendSystemStatus(
    status: 'online' | 'offline' | 'warning',
    message: string,
    details?: Record<string, string>
  ): Promise<boolean> {
    const colorMap = {
      online: '#36a64f',
      offline: '#dc3545',
      warning: '#ffc107',
    };

    const emojiMap = {
      online: '✅',
      offline: '❌',
      warning: '⚠️',
    };

    const fields = details
      ? Object.entries(details).map(([title, value]) => ({
          title,
          value,
          short: true,
        }))
      : undefined;

    return this.sendWebhook({
      attachments: [
        {
          color: colorMap[status],
          fallback: message,
          text: `${emojiMap[status]} ${message}`,
          fields,
          footer: 'Sistema VISÃO',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  }

  /**
   * Create blocks for camera grid
   */
  createCameraGridBlocks(
    cameras: Array<{ name: string; status: string; thumbnail?: string }>
  ): SlackBlock[] {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📹 Status das Câmeras',
          emoji: true,
        },
      },
    ];

    cameras.forEach((camera) => {
      const statusEmoji = camera.status === 'online' ? '🟢' : '🔴';
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${statusEmoji} *${camera.name}*`,
        },
        accessory: camera.thumbnail
          ? {
              type: 'image',
              image_url: camera.thumbnail,
              alt_text: camera.name,
            }
          : undefined,
      });
    });

    return blocks;
  }

  /**
   * Verify Slack request signature
   */
  verifySignature(
    signature: string,
    timestamp: string,
    body: string
  ): boolean {
    if (!this.config?.signingSecret) {
      return false;
    }

    // In a real implementation, you would verify the HMAC signature
    // This is a placeholder that would need crypto implementation
    const baseString = `v0:${timestamp}:${body}`;
    );
    
    return signature.startsWith('v0=');
  }

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Check if webhook is configured
   */
  get hasWebhook(): boolean {
    return !!this.config?.webhookUrl;
  }

  /**
   * Check if API is configured
   */
  get hasApi(): boolean {
    return !!this.config?.botToken;
  }
}

// Singleton instance
export const slackService = new SlackService();

export default SlackService;
