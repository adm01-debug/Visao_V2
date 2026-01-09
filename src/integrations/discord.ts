// Discord Integration - Projeto VISÃO
// Integração com Discord com tipagem forte

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export interface DiscordMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
  tts?: boolean;
}

export interface DiscordWebhookConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

export interface DiscordAlertPayload {
  alertId: string;
  type: string;
  severity: string;
  cameraName: string;
  message: string;
  imageUrl?: string;
  timestamp: Date;
}

const SEVERITY_COLORS: Record<string, number> = {
  low: 0x3498db,
  medium: 0xf39c12,
  high: 0xe74c3c,
  critical: 0x9b59b6,
};

export const createAlertEmbed = (payload: DiscordAlertPayload): DiscordEmbed => ({
  title: `🚨 ${payload.type.toUpperCase()}`,
  description: payload.message,
  color: SEVERITY_COLORS[payload.severity] || 0x95a5a6,
  timestamp: payload.timestamp.toISOString(),
  fields: [
    { name: 'Câmera', value: payload.cameraName, inline: true },
    { name: 'Severidade', value: payload.severity.toUpperCase(), inline: true },
    { name: 'ID do Alerta', value: payload.alertId, inline: true },
  ],
  image: payload.imageUrl ? { url: payload.imageUrl } : undefined,
  footer: { text: 'VISÃO - Sistema de Vigilância' },
});

export const sendDiscordMessage = async (
  config: DiscordWebhookConfig,
  message: DiscordMessage
): Promise<boolean> => {
  try {
    const body: DiscordMessage = {
      ...message,
      username: message.username || config.username || 'VISÃO Bot',
      avatar_url: message.avatar_url || config.avatarUrl,
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.ok;
  } catch (error) {
    console.error('[Discord] Send error:', error);
    return false;
  }
};

export const sendAlertToDiscord = async (
  config: DiscordWebhookConfig,
  payload: DiscordAlertPayload
): Promise<boolean> => {
  const embed = createAlertEmbed(payload);
  return sendDiscordMessage(config, { embeds: [embed] });
};

export default {
  sendMessage: sendDiscordMessage,
  sendAlert: sendAlertToDiscord,
  createAlertEmbed,
};
