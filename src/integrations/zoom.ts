/**
 * Zoom Integration
 */
class ZoomIntegration {
  private accessToken = '';

  configure(accessToken: string) { this.accessToken = accessToken; }

  private async request(endpoint: string, method = 'GET', body?: any) {
    const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async getUser() { return this.request('/users/me'); }

  async createMeeting(topic: string, startTime: Date, duration = 60) {
    return this.request('/users/me/meetings', 'POST', {
      topic,
      type: 2,
      start_time: startTime.toISOString(),
      duration,
      timezone: 'America/Sao_Paulo',
    });
  }

  async listMeetings() { return this.request('/users/me/meetings'); }
  async getMeeting(meetingId: string) { return this.request(`/meetings/${meetingId}`); }
  async deleteMeeting(meetingId: string) { return this.request(`/meetings/${meetingId}`, 'DELETE'); }
}

export const zoom = new ZoomIntegration();
export default zoom;
