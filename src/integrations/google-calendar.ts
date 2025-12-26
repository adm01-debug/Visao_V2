/**
 * Google Calendar Integration
 */
class GoogleCalendarIntegration {
  private accessToken = '';

  configure(accessToken: string) { this.accessToken = accessToken; }

  private async request(endpoint: string, method = 'GET', body?: any) {
    const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async listCalendars() { return this.request('/users/me/calendarList'); }
  
  async listEvents(calendarId = 'primary', timeMin?: Date, timeMax?: Date) {
    let endpoint = `/calendars/${calendarId}/events?`;
    if (timeMin) endpoint += `timeMin=${timeMin.toISOString()}&`;
    if (timeMax) endpoint += `timeMax=${timeMax.toISOString()}`;
    return this.request(endpoint);
  }

  async createEvent(calendarId = 'primary', event: any) {
    return this.request(`/calendars/${calendarId}/events`, 'POST', event);
  }

  async deleteEvent(calendarId = 'primary', eventId: string) {
    return this.request(`/calendars/${calendarId}/events/${eventId}`, 'DELETE');
  }
}

export const googleCalendar = new GoogleCalendarIntegration();
export default googleCalendar;
