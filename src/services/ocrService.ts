/**
 * OCR Service
 * Optical Character Recognition
 */

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

class OCRService {
  private worker: any = null;

  async initialize(lang = 'por'): Promise<void> {
    const Tesseract = await import('tesseract.js');
    this.worker = await Tesseract.createWorker(lang);
  }

  async recognize(image: File | Blob | HTMLImageElement | HTMLCanvasElement | string): Promise<OCRResult> {
    if (!this.worker) await this.initialize();
    
    const { data } = await this.worker.recognize(image);
    
    return {
      text: data.text,
      confidence: data.confidence / 100,
      blocks: data.blocks?.map((block: any) => ({
        text: block.text,
        confidence: block.confidence / 100,
        bbox: {
          x: block.bbox.x0,
          y: block.bbox.y0,
          width: block.bbox.x1 - block.bbox.x0,
          height: block.bbox.y1 - block.bbox.y0,
        },
      })) || [],
    };
  }

  async recognizeMultiple(images: (File | Blob | string)[]): Promise<OCRResult[]> {
    return Promise.all(images.map(img => this.recognize(img)));
  }

  async terminate(): Promise<void> {
    await this.worker?.terminate();
    this.worker = null;
  }
}

export const ocrService = new OCRService();
export default ocrService;
