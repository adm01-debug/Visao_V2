/**
 * YouTube Integration
 * YouTube Data API
 */
class YouTubeIntegration {
  private apiKey = '';

  configure(apiKey: string) { this.apiKey = apiKey; }

  private async request(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`https://www.googleapis.com/youtube/v3${endpoint}`);
    url.searchParams.set('key', this.apiKey);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const response = await fetch(url.toString());
    return response.json();
  }

  async searchVideos(query: string, maxResults = 10) {
    return this.request('/search', { part: 'snippet', q: query, type: 'video', maxResults: String(maxResults) });
  }

  async getVideoDetails(videoId: string) {
    return this.request('/videos', { part: 'snippet,statistics,contentDetails', id: videoId });
  }

  async getChannelInfo(channelId: string) {
    return this.request('/channels', { part: 'snippet,statistics', id: channelId });
  }
}

export const youtube = new YouTubeIntegration();
export default youtube;
