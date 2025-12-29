/**
 * VISÃO - Sistema de Vigilância Inteligente
 * OCR Service - Reconhecimento Óptico de Caracteres
 * 
 * @module services/ocrService
 */

import type { Worker, RecognizeResult } from 'tesseract.js';

// ============================================
// TIPOS
// ============================================

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TesseractBlock {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export type OCRInput = File | Blob | HTMLImageElement | HTMLCanvasElement | string;
export type OCRLanguage = 'por' | 'eng' | 'spa' | 'fra' | 'deu' | 'ita';

// ============================================
// SERVICE
// ============================================

class OCRService {
  private worker: Worker | null = null;
  private currentLang: OCRLanguage = 'por';

  /**
   * Inicializar worker do Tesseract
   */
  async initialize(lang: OCRLanguage = 'por'): Promise<void> {
    if (this.worker && this.currentLang === lang) {
      return;
    }
    
    await this.terminate();
    
    const Tesseract = await import('tesseract.js');
    this.worker = await Tesseract.createWorker(lang);
    this.currentLang = lang;
  }

  /**
   * Reconhecer texto em imagem
   */
  async recognize(image: OCRInput, lang?: OCRLanguage): Promise<OCRResult> {
    if (!this.worker || (lang && lang !== this.currentLang)) {
      await this.initialize(lang || this.currentLang);
    }
    
    const { data } = await this.worker!.recognize(image) as RecognizeResult;
    
    const blocks: OCRBlock[] = (data.blocks || []).map((block: TesseractBlock) => ({
      text: block.text,
      confidence: block.confidence / 100,
      bbox: {
        x: block.bbox.x0,
        y: block.bbox.y0,
        width: block.bbox.x1 - block.bbox.x0,
        height: block.bbox.y1 - block.bbox.y0,
      },
    }));
    
    return {
      text: data.text,
      confidence: data.confidence / 100,
      blocks,
    };
  }

  /**
   * Reconhecer texto em múltiplas imagens
   */
  async recognizeMultiple(images: OCRInput[], lang?: OCRLanguage): Promise<OCRResult[]> {
    return Promise.all(images.map((img) => this.recognize(img, lang)));
  }

  /**
   * Detectar texto em imagem (apenas detecção, sem OCR completo)
   */
  async detect(image: OCRInput): Promise<OCRBlock[]> {
    const result = await this.recognize(image);
    return result.blocks;
  }

  /**
   * Extrair apenas texto limpo
   */
  async extractText(image: OCRInput, lang?: OCRLanguage): Promise<string> {
    const result = await this.recognize(image, lang);
    return result.text.trim();
  }

  /**
   * Verificar se worker está inicializado
   */
  isInitialized(): boolean {
    return this.worker !== null;
  }

  /**
   * Obter idioma atual
   */
  getCurrentLanguage(): OCRLanguage {
    return this.currentLang;
  }

  /**
   * Encerrar worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();
export default ocrService;
