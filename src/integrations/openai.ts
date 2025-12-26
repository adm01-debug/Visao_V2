/**
 * OpenAI Integration
 * GPT and Vision API
 */
export interface OpenAIConfig { apiKey: string; organization?: string; }

class OpenAIIntegration {
  private config: OpenAIConfig = { apiKey: '' };
  private baseUrl = 'https://api.openai.com/v1';

  configure(config: OpenAIConfig) { this.config = config; }

  private async request(endpoint: string, body: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...(this.config.organization && { 'OpenAI-Organization': this.config.organization }),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    return response.json();
  }

  async chat(messages: { role: string; content: string }[], model = 'gpt-4') {
    return this.request('/chat/completions', { model, messages });
  }

  async createImage(prompt: string, size = '1024x1024') {
    return this.request('/images/generations', { prompt, size, n: 1 });
  }

  async transcribe(audio: Blob) {
    const formData = new FormData();
    formData.append('file', audio, 'audio.webm');
    formData.append('model', 'whisper-1');
    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      body: formData,
    });
    return response.json();
  }

  async analyzeImage(imageUrl: string, prompt: string) {
    return this.chat([
      { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } }] as any }
    ], 'gpt-4-vision-preview');
  }
}

export const openai = new OpenAIIntegration();
export default openai;
