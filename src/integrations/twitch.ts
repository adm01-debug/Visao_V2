/**
 * Twitch Integration
 * Streaming platform
 */
class TwitchIntegration {
  private clientId = '';
  private accessToken = '';

  configure(clientId: string, accessToken: string) {
    this.clientId = clientId;
    this.accessToken = accessToken;
  }

  private async request(endpoint: string) {
    const response = await fetch(`https://api.twitch.tv/helix${endpoint}`, {
      headers: { 'Client-ID': this.clientId, 'Authorization': `Bearer ${this.accessToken}` },
    });
    return response.json();
  }

  async getUser(login: string) { return this.request(`/users?login=${login}`); }
  async getStream(userId: string) { return this.request(`/streams?user_id=${userId}`); }
  async getChannelInfo(broadcasterId: string) { return this.request(`/channels?broadcaster_id=${broadcasterId}`); }
}

export const twitch = new TwitchIntegration();
export default twitch;
