/**
 * Microsoft Graph Integration - Projeto VISÃO
 * Tipagem forte para integração com Microsoft Graph
 */

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
}

export interface GraphCalendarEvent {
  id: string;
  subject: string;
  bodyPreview: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  organizer: { emailAddress: { name: string; address: string } };
}

export interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  isRead: boolean;
}

export interface GraphDriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
}

export interface GraphListResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

export interface SendEmailParams {
  subject: string;
  body: string;
  to: string[];
}

class MicrosoftGraphIntegration {
  private accessToken = "";
  private baseUrl = "https://graph.microsoft.com/v1.0";

  configure(accessToken: string): void {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    method = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json() as Promise<T>;
  }

  async getMe(): Promise<GraphUser> {
    return this.request<GraphUser>("/me");
  }

  async getCalendarEvents(): Promise<GraphListResponse<GraphCalendarEvent>> {
    return this.request<GraphListResponse<GraphCalendarEvent>>(
      "/me/calendar/events"
    );
  }

  async getEmails(top = 10): Promise<GraphListResponse<GraphMessage>> {
    return this.request<GraphListResponse<GraphMessage>>(
      `/me/messages?$top=${top}`
    );
  }

  async getDriveFiles(): Promise<GraphListResponse<GraphDriveItem>> {
    return this.request<GraphListResponse<GraphDriveItem>>(
      "/me/drive/root/children"
    );
  }

  async sendEmail(message: SendEmailParams): Promise<void> {
    await this.request<void>("/me/sendMail", "POST", {
      message: {
        subject: message.subject,
        body: { contentType: "HTML", content: message.body },
        toRecipients: message.to.map((email) => ({
          emailAddress: { address: email },
        })),
      },
    });
  }
}

export const microsoftGraph = new MicrosoftGraphIntegration();
export default microsoftGraph;

