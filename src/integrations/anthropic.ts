/**
 * Anthropic Integration
 * Claude API
 */
export interface AnthropicConfig { apiKey: string; }

class AnthropicIntegration {
  private apiKey = '';
  private baseUrl = 'https://api.anthropic.com/v1';

  configure(config: AnthropicConfig) { this.apiKey = config.apiKey; }

  async chat(messages: { role: string; content: string }[], model = 'claude-3-sonnet-20240229') {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, messages, max_tokens: 4096 }),
    });
    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
    return response.json();
  }

  async *streamChat(messages: { role: string; content: string }[], model = 'claude-3-sonnet-20240229') {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, messages, max_tokens: 4096, stream: true }),
    });
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      yield chunk;
    }
  }
}

export const anthropic = new AnthropicIntegration();
export default anthropic;
