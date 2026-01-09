/**
 * Google Calendar Integration - Projeto VISÃO
 * Tipagem forte para integração com Google Calendar
 */

export interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: "email" | "popup";
      minutes: number;
    }>;
  };
}

export interface CalendarListResponse {
  kind: string;
  etag: string;
  items: Array<{
    id: string;
    summary: string;
    primary?: boolean;
    accessRole: string;
  }>;
}

export interface EventListResponse {
  kind: string;
  items: CalendarEvent[];
  nextPageToken?: string;
}

class GoogleCalendarIntegration {
  private accessToken = "";

  configure(accessToken: string): void {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    method = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    );
    return response.json() as Promise<T>;
  }

  async listCalendars(): Promise<CalendarListResponse> {
    return this.request<CalendarListResponse>("/users/me/calendarList");
  }

  async listEvents(
    calendarId = "primary",
    timeMin?: Date,
    timeMax?: Date
  ): Promise<EventListResponse> {
    let endpoint = `/calendars/${calendarId}/events?`;
    if (timeMin) endpoint += `timeMin=${timeMin.toISOString()}&`;
    if (timeMax) endpoint += `timeMax=${timeMax.toISOString()}`;
    return this.request<EventListResponse>(endpoint);
  }

  async createEvent(
    calendarId = "primary",
    event: CalendarEvent
  ): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `/calendars/${calendarId}/events`,
      "POST",
      event as unknown as Record<string, unknown>
    );
  }

  async deleteEvent(calendarId = "primary", eventId: string): Promise<void> {
    await this.request<void>(
      `/calendars/${calendarId}/events/${eventId}`,
      "DELETE"
    );
  }
}

export const googleCalendar = new GoogleCalendarIntegration();
export default googleCalendar;

