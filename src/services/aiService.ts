/**
 * AI Service
 * Integration with AI models (OpenAI, Claude, etc)
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

class AIService {
  private apiKey: string = '';
  private provider: 'openai' | 'anthropic' = 'openai';
  private baseUrl: string = '';

  configure(options: { apiKey: string; provider?: 'openai' | 'anthropic'; baseUrl?: string }) {
    this.apiKey = options.apiKey;
    this.provider = options.provider || 'openai';
    this.baseUrl = options.baseUrl || (this.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com/v1');
  }

  async chat(messages: AIMessage[], options: AICompletionOptions = {}): Promise<AIResponse> {
    const { model = this.provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229', maxTokens = 1024, temperature = 0.7 } = options;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...(this.provider === 'anthropic' && { 'anthropic-version': '2023-06-01' }),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || data.content?.[0]?.text || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  async *streamChat(messages: AIMessage[], options: AICompletionOptions = {}): AsyncGenerator<string> {
    const { model = 'gpt-4', maxTokens = 1024, temperature = 0.7 } = options;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, stream: true }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
      for (const line of lines) {
        const data = line.replace('data: ', '');
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {}
      }
    }
  }

  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    const messages: AIMessage[] = [
      { role: 'user', content: `${prompt}\n\nImage: ${imageUrl}` }
    ];
    const response = await this.chat(messages, { model: 'gpt-4-vision-preview' });
    return response.content;
  }
}

export const aiService = new AIService();
export default aiService;
