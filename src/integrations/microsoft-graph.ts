/**
 * Microsoft Graph Integration
 */
class MicrosoftGraphIntegration {
  private accessToken = '';
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  configure(accessToken: string) { this.accessToken = accessToken; }

  private async request(endpoint: string, method = 'GET', body?: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async getMe() { return this.request('/me'); }
  async getCalendarEvents() { return this.request('/me/calendar/events'); }
  async getEmails(top = 10) { return this.request(`/me/messages?$top=${top}`); }
  async getDriveFiles() { return this.request('/me/drive/root/children'); }
  async sendEmail(message: { subject: string; body: string; to: string[] }) {
    return this.request('/me/sendMail', 'POST', {
      message: {
        subject: message.subject,
        body: { contentType: 'HTML', content: message.body },
        toRecipients: message.to.map(email => ({ emailAddress: { address: email } })),
      },
    });
  }
}

export const microsoftGraph = new MicrosoftGraphIntegration();
export default microsoftGraph;
