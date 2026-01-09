/**
 * OpenAI Integration - Projeto VISÃO
 * GPT and Vision API com tipagem forte
 */

export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatContent[];
}

export type ChatContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ImageGenerationRequest {
  prompt: string;
  size: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
  n: number;
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
}

class OpenAIIntegration {
  private config: OpenAIConfig = { apiKey: "" };
  private baseUrl = "https://api.openai.com/v1";

  configure(config: OpenAIConfig): void {
    this.config = config;
  }

  private async request<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(this.config.organization && {
          "OpenAI-Organization": this.config.organization,
        }),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    return response.json() as Promise<T>;
  }

  async chat(
    messages: ChatMessage[],
    model = "gpt-4"
  ): Promise<ChatCompletionResponse> {
    return this.request<ChatCompletionResponse>("/chat/completions", {
      model,
      messages,
    });
  }

  async createImage(
    prompt: string,
    size: ImageGenerationRequest["size"] = "1024x1024"
  ): Promise<ImageGenerationResponse> {
    return this.request<ImageGenerationResponse>("/images/generations", {
      prompt,
      size,
      n: 1,
    });
  }

  async transcribe(audio: Blob): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append("file", audio, "audio.webm");
    formData.append("model", "whisper-1");
    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
      body: formData,
    });
    return response.json() as Promise<TranscriptionResponse>;
  }

  async analyzeImage(
    imageUrl: string,
    prompt: string
  ): Promise<ChatCompletionResponse> {
    const content: ChatContent[] = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: imageUrl } },
    ];
    return this.chat([{ role: "user", content }], "gpt-4-vision-preview");
  }
}

export const openai = new OpenAIIntegration();
export default openai;

