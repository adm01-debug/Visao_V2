/**
 * SMS Integration Service
 * Supports Twilio and AWS SNS providers
 */

export type SmsProvider = 'twilio' | 'sns';

export interface SmsConfig {
  provider: SmsProvider;
  // Twilio config
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  // AWS SNS config
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  snsSenderId?: string;
}

export interface SmsMessage {
  to: string;
  body: string;
  mediaUrl?: string; // For MMS (Twilio only)
}

export interface SmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

export interface SmsBulkResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{ to: string; response: SmsResponse }>;
}

class SmsService {
  private config: SmsConfig | null = null;

  /**
   * Initialize the service
   */
  initialize(config: SmsConfig): void {
    this.config = config;
    console.log(`[SMS] Service initialized with ${config.provider}`);
  }

  /**
   * Format phone number to E.164
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Brazilian number without country code
    if (digits.length === 11) {
      return `+55${digits}`;
    }
    
    // Already has country code
    if (digits.length >= 12) {
      return `+${digits}`;
    }
    
    return phone;
  }

  /**
   * Send SMS
   */
  async send(message: SmsMessage): Promise<SmsResponse> {
    if (!this.config) {
      throw new Error('SMS service not initialized');
    }

    const formattedTo = this.formatPhoneNumber(message.to);

    switch (this.config.provider) {
      case 'twilio':
        return this.sendViaTwilio({ ...message, to: formattedTo });
      case 'sns':
        return this.sendViaSns({ ...message, to: formattedTo });
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  /**
   * Send via Twilio
   */
  private async sendViaTwilio(message: SmsMessage): Promise<SmsResponse> {
    if (!this.config?.twilioAccountSid || !this.config?.twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    try {
      const auth = btoa(`${this.config.twilioAccountSid}:${this.config.twilioAuthToken}`);
      
      const formData = new URLSearchParams();
      formData.append('To', message.to);
      formData.append('From', this.config.twilioPhoneNumber || '');
      formData.append('Body', message.body);
      
      if (message.mediaUrl) {
        formData.append('MediaUrl', message.mediaUrl);
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Twilio API error' };
      }

      return {
        success: true,
        messageId: data.sid,
        status: data.status,
      };
    } catch (error) {
      console.error('[SMS] Twilio error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send via AWS SNS
   */
  private async sendViaSns(message: SmsMessage): Promise<SmsResponse> {
    if (!this.config?.awsAccessKeyId || !this.config?.awsSecretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    try {
      const region = this.config.awsRegion || 'us-east-1';
      const endpoint = `https://sns.${region}.amazonaws.com`;
      
      const params = new URLSearchParams({
        Action: 'Publish',
        Version: '2010-03-31',
        PhoneNumber: message.to,
        Message: message.body,
      });

      if (this.config.snsSenderId) {
        params.append('MessageAttributes.entry.1.Name', 'AWS.SNS.SMS.SenderID');
        params.append('MessageAttributes.entry.1.Value.DataType', 'String');
        params.append('MessageAttributes.entry.1.Value.StringValue', this.config.snsSenderId);
      }

      // Set SMS type to Transactional for reliability
      params.append('MessageAttributes.entry.2.Name', 'AWS.SNS.SMS.SMSType');
      params.append('MessageAttributes.entry.2.Value.DataType', 'String');
      params.append('MessageAttributes.entry.2.Value.StringValue', 'Transactional');

      // Note: In production, you would need proper AWS Signature V4 signing
      // This is a simplified version - use AWS SDK in production
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const text = await response.text();
      
      if (!response.ok) {
        return { success: false, error: text };
      }

      // Parse XML response for MessageId
      const messageIdMatch = text.match(/<MessageId>(.+?)<\/MessageId>/);
      
      return {
        success: true,
        messageId: messageIdMatch?.[1],
      };
    } catch (error) {
      console.error('[SMS] SNS error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulk(
    recipients: string[],
    body: string,
    mediaUrl?: string
  ): Promise<SmsBulkResult> {
    const results: Array<{ to: string; response: SmsResponse }> = [];
    let successful = 0;
    let failed = 0;

    for (const to of recipients) {
      const response = await this.send({ to, body, mediaUrl });
      results.push({ to, response });
      
      if (response.success) {
        successful++;
      } else {
        failed++;
      }

      // Rate limiting - wait between messages
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      total: recipients.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Send alert SMS
   */
  async sendAlert(
    to: string | string[],
    alertType: string,
    cameraName: string,
    timestamp: Date
  ): Promise<SmsResponse | SmsBulkResult> {
    const formattedTime = timestamp.toLocaleString('pt-BR');
    
    const body = `🚨 ALERTA VISÃO\nTipo: ${alertType}\nCâmera: ${cameraName}\nHora: ${formattedTime}`;

    if (Array.isArray(to)) {
      return this.sendBulk(to, body);
    }

    return this.send({ to, body });
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(to: string, code: string): Promise<SmsResponse> {
    const body = `Seu código de verificação VISÃO é: ${code}\n\nVálido por 5 minutos.`;
    return this.send({ to, body });
  }

  /**
   * Send system alert
   */
  async sendSystemAlert(
    to: string | string[],
    title: string,
    message: string
  ): Promise<SmsResponse | SmsBulkResult> {
    const body = `⚠️ ${title}\n\n${message}\n\n- Sistema VISÃO`;

    if (Array.isArray(to)) {
      return this.sendBulk(to, body);
    }

    return this.send({ to, body });
  }

  /**
   * Get message status (Twilio only)
   */
  async getMessageStatus(messageId: string): Promise<SmsResponse> {
    if (this.config?.provider !== 'twilio') {
      return { success: false, error: 'Status check only available for Twilio' };
    }

    if (!this.config?.twilioAccountSid || !this.config?.twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    try {
      const auth = btoa(`${this.config.twilioAccountSid}:${this.config.twilioAuthToken}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.twilioAccountSid}/Messages/${messageId}.json`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Twilio API error' };
      }

      return {
        success: true,
        messageId: data.sid,
        status: data.status,
      };
    } catch (error) {
      console.error('[SMS] Status check error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    // Brazilian: 11 digits (with area code) or 13+ (with country code)
    return digits.length >= 10 && digits.length <= 15;
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
  get provider(): SmsProvider | null {
    return this.config?.provider || null;
  }
}

// Singleton instance
export const smsService = new SmsService();

export default SmsService;
