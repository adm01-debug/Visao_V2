/**
 * Discord Integration
 */
class DiscordIntegration {
  private webhookUrl = '';
  private botToken = '';

  configure(options: { webhookUrl?: string; botToken?: string }) {
    if (options.webhookUrl) this.webhookUrl = options.webhookUrl;
    if (options.botToken) this.botToken = options.botToken;
  }

  async sendWebhook(content: string, embeds?: any[]) {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds }),
    });
    return response.ok;
  }

  async sendEmbed(title: string, description: string, color = 0x5865f2, fields?: { name: string; value: string; inline?: boolean }[]) {
    return this.sendWebhook('', [{ title, description, color, fields }]);
  }

  async sendAlert(title: string, message: string, type: 'info' | 'warning' | 'error' = 'info') {
    const colors = { info: 0x3498db, warning: 0xf39c12, error: 0xe74c3c };
    return this.sendEmbed(title, message, colors[type]);
  }
}

export const discord = new DiscordIntegration();
export default discord;
