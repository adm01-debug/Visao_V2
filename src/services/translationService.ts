/**
 * Translation Service
 * Multi-language translation
 */
export interface TranslationResult {
  text: string;
  detectedLanguage?: string;
  confidence?: number;
}

class TranslationService {
  private apiKey = '';
  private provider: 'google' | 'deepl' | 'libre' = 'libre';

  configure(options: { apiKey?: string; provider?: 'google' | 'deepl' | 'libre' }) {
    if (options.apiKey) this.apiKey = options.apiKey;
    if (options.provider) this.provider = options.provider;
  }

  async translate(text: string, targetLang: string, sourceLang?: string): Promise<TranslationResult> {
    if (this.provider === 'libre') {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: sourceLang || 'auto', target: targetLang }),
      });
      const data = await response.json();
      return { text: data.translatedText, detectedLanguage: data.detectedLanguage?.language };
    }
    throw new Error(`Provider ${this.provider} requires API key configuration`);
  }

  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    const response = await fetch('https://libretranslate.com/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });
    const data = await response.json();
    return { language: data[0]?.language || 'unknown', confidence: data[0]?.confidence || 0 };
  }

  async translateBatch(texts: string[], targetLang: string): Promise<TranslationResult[]> {
    return Promise.all(texts.map(text => this.translate(text, targetLang)));
  }
}

export const translationService = new TranslationService();
export default translationService;
