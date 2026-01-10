/**
 * Email Integration Service
 * Supports Resend and SendGrid providers
 */

export type EmailProvider = 'resend' | 'sendgrid';

export interface EmailConfig {
  provider: EmailProvider;
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

class EmailService {
  private config: EmailConfig | null = null;

  /**
   * Initialize the service
   */
  initialize(config: EmailConfig): void {
    this.config = config;
      }

  /**
   * Send email
   */
  async send(message: EmailMessage): Promise<EmailResponse> {
    if (!this.config) {
      throw new Error('Email service not initialized');
    }

    switch (this.config.provider) {
      case 'resend':
        return this.sendViaResend(message);
      case 'sendgrid':
        return this.sendViaSendGrid(message);
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  /**
   * Send via Resend
   */
  private async sendViaResend(message: EmailMessage): Promise<EmailResponse> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config!.fromName
            ? `${this.config!.fromName} <${this.config!.fromEmail}>`
            : this.config!.fromEmail,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
          cc: message.cc,
          bcc: message.bcc,
          reply_to: message.replyTo || this.config!.replyTo,
          attachments: message.attachments?.map((att) => ({
            filename: att.filename,
            content: typeof att.content === 'string' 
              ? att.content 
              : att.content.toString('base64'),
            content_type: att.contentType,
          })),
          tags: message.tags?.map((tag) => ({ name: tag, value: 'true' })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Resend API error' };
      }

      return { success: true, messageId: data.id };
    } catch (error) {
            return { success: false, error: String(error) };
    }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(message: EmailMessage): Promise<EmailResponse> {
    try {
      const toEmails = Array.isArray(message.to) ? message.to : [message.to];
      
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: toEmails.map((email) => ({ email })),
              cc: message.cc
                ? (Array.isArray(message.cc) ? message.cc : [message.cc]).map((email) => ({ email }))
                : undefined,
              bcc: message.bcc
                ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]).map((email) => ({ email }))
                : undefined,
            },
          ],
          from: {
            email: this.config!.fromEmail,
            name: this.config!.fromName,
          },
          reply_to: message.replyTo || this.config!.replyTo
            ? { email: message.replyTo || this.config!.replyTo }
            : undefined,
          subject: message.subject,
          content: [
            message.text && { type: 'text/plain', value: message.text },
            message.html && { type: 'text/html', value: message.html },
          ].filter(Boolean),
          attachments: message.attachments?.map((att) => ({
            filename: att.filename,
            content: typeof att.content === 'string'
              ? att.content
              : att.content.toString('base64'),
            type: att.contentType,
            disposition: att.disposition || 'attachment',
            content_id: att.contentId,
          })),
          categories: message.tags,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.errors?.[0]?.message || 'SendGrid API error' };
      }

      const messageId = response.headers.get('X-Message-Id');
      return { success: true, messageId: messageId || undefined };
    } catch (error) {
            return { success: false, error: String(error) };
    }
  }

  /**
   * Send alert email
   */
  async sendAlertEmail(
    to: string | string[],
    alertType: string,
    cameraName: string,
    timestamp: Date,
    imageUrl?: string,
    detailsUrl?: string
  ): Promise<EmailResponse> {
    const formattedTime = timestamp.toLocaleString('pt-BR');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e94560; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .label { color: #666; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 16px; font-weight: bold; color: #1a1a2e; }
          .button { display: inline-block; background: #e94560; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .image { max-width: 100%; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Alerta do Sistema VISÃO</h1>
          </div>
          <div class="content">
            <div class="alert-info">
              <p class="label">Tipo de Alerta</p>
              <p class="value">${alertType}</p>
            </div>
            <div class="alert-info">
              <p class="label">Câmera</p>
              <p class="value">${cameraName}</p>
            </div>
            <div class="alert-info">
              <p class="label">Data/Hora</p>
              <p class="value">${formattedTime}</p>
            </div>
            ${imageUrl ? `<img src="${imageUrl}" alt="Snapshot" class="image" />` : ''}
            ${detailsUrl ? `<a href="${detailsUrl}" class="button">Ver Detalhes</a>` : ''}
          </div>
          <div class="footer">
            <p>Sistema VISÃO - Videomonitoramento Inteligente</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
ALERTA DO SISTEMA VISÃO

Tipo: ${alertType}
Câmera: ${cameraName}
Data/Hora: ${formattedTime}

${detailsUrl ? `Acesse: ${detailsUrl}` : ''}

---
Sistema VISÃO - Videomonitoramento Inteligente
    `.trim();

    return this.send({
      to,
      subject: `🚨 Alerta: ${alertType} - ${cameraName}`,
      html,
      text,
      tags: ['alert', alertType.toLowerCase().replace(/\s+/g, '-')],
    });
  }

  /**
   * Send daily report
   */
  async sendDailyReport(
    to: string | string[],
    date: Date,
    stats: {
      totalAlerts: number;
      alertsByType: Record<string, number>;
      camerasOnline: number;
      camerasTotal: number;
      topCameras: Array<{ name: string; alerts: number }>;
    }
  ): Promise<EmailResponse> {
    const formattedDate = date.toLocaleDateString('pt-BR');
    
    const alertsHtml = Object.entries(stats.alertsByType)
      .map(([type, count]) => `<li>${type}: <strong>${count}</strong></li>`)
      .join('');

    const topCamerasHtml = stats.topCameras
      .map((cam) => `<li>${cam.name}: <strong>${cam.alerts} alertas</strong></li>`)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
          .stat-box { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; display: inline-block; width: 45%; text-align: center; }
          .stat-value { font-size: 32px; font-weight: bold; color: #e94560; }
          .stat-label { color: #666; font-size: 12px; text-transform: uppercase; }
          h3 { color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px; }
          ul { background: white; padding: 15px 15px 15px 35px; border-radius: 8px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Relatório Diário - VISÃO</h1>
            <p>${formattedDate}</p>
          </div>
          <div class="content">
            <div style="text-align: center;">
              <div class="stat-box">
                <div class="stat-value">${stats.totalAlerts}</div>
                <div class="stat-label">Total de Alertas</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.camerasOnline}/${stats.camerasTotal}</div>
                <div class="stat-label">Câmeras Online</div>
              </div>
            </div>
            
            <h3>Alertas por Tipo</h3>
            <ul>${alertsHtml}</ul>
            
            <h3>Câmeras com Mais Alertas</h3>
            <ul>${topCamerasHtml}</ul>
          </div>
          <div class="footer">
            <p>Sistema VISÃO - Videomonitoramento Inteligente</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.send({
      to,
      subject: `📊 Relatório Diário VISÃO - ${formattedDate}`,
      html,
      tags: ['report', 'daily'],
    });
  }

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Get current provider
   */
  get provider(): EmailProvider | null {
    return this.config?.provider || null;
  }
}

// Singleton instance
export const emailService = new EmailService();

export default EmailService;
