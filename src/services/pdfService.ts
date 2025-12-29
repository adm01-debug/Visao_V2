/**
 * VISÃO - Sistema de Vigilância Inteligente
 * PDF Service - Geração e manipulação de PDFs
 * 
 * @module services/pdfService
 */

// ============================================
// TIPOS
// ============================================

export type PDFFormat = 'a4' | 'letter' | 'legal';
export type PDFOrientation = 'portrait' | 'landscape';

export interface PDFMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PDFOptions {
  format?: PDFFormat;
  orientation?: PDFOrientation;
  margin?: PDFMargins;
  title?: string;
  author?: string;
  subject?: string;
}

export interface PDFSection {
  heading: string;
  content: string;
}

export interface PDFReportData {
  title: string;
  subtitle?: string;
  sections: PDFSection[];
  footer?: string;
  date?: Date;
}

export interface TextItem {
  str: string;
  transform?: number[];
}

// ============================================
// SERVICE
// ============================================

class PDFService {
  private defaultOptions: PDFOptions = {
    format: 'a4',
    orientation: 'portrait',
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
  };

  /**
   * Gerar PDF a partir de HTML
   */
  async generateFromHTML(html: string, options: PDFOptions = {}): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    const doc = new jsPDF({
      orientation: mergedOptions.orientation,
      unit: 'mm',
      format: mergedOptions.format,
    });
    
    // Configurar metadados
    if (mergedOptions.title) {
      doc.setProperties({ title: mergedOptions.title });
    }
    
    // Converter HTML para texto
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || '';
    
    // Adicionar texto com margens
    const margin = mergedOptions.margin || this.defaultOptions.margin!;
    const maxWidth = doc.internal.pageSize.getWidth() - margin.left - margin.right;
    const lines = doc.splitTextToSize(text, maxWidth);
    
    doc.text(lines, margin.left, margin.top);
    
    return doc.output('blob');
  }

  /**
   * Gerar relatório formatado
   */
  async generateReport(data: PDFReportData, options: PDFOptions = {}): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    const doc = new jsPDF({
      orientation: mergedOptions.orientation,
      unit: 'mm',
      format: mergedOptions.format,
    });
    
    const margin = mergedOptions.margin || this.defaultOptions.margin!;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin.left - margin.right;
    
    let y = margin.top;
    
    // Título
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Subtítulo
    if (data.subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(data.subtitle, pageWidth / 2, y, { align: 'center' });
      y += 8;
    }
    
    // Data
    if (data.date) {
      doc.setFontSize(10);
      doc.text(data.date.toLocaleDateString('pt-BR'), pageWidth / 2, y, { align: 'center' });
      y += 10;
    }
    
    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(margin.left, y, pageWidth - margin.right, y);
    y += 10;
    
    // Seções
    data.sections.forEach((section) => {
      // Verificar se precisa nova página
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = margin.top;
      }
      
      // Heading
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(section.heading, margin.left, y);
      y += 8;
      
      // Content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(section.content, maxWidth);
      doc.text(lines, margin.left, y);
      y += lines.length * 5 + 10;
    });
    
    // Footer
    if (data.footer) {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `${data.footer} - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    }
    
    return doc.output('blob');
  }

  /**
   * Mesclar múltiplos PDFs
   */
  async mergePDFs(pdfs: Blob[]): Promise<Blob> {
    const { PDFDocument } = await import('pdf-lib');
    const merged = await PDFDocument.create();
    
    for (const pdf of pdfs) {
      const bytes = await pdf.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }
    
    const bytes = await merged.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /**
   * Extrair texto de PDF
   */
  async extractText(pdf: Blob): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    const bytes = await pdf.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    
    const textParts: string[] = [];
    
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: TextItem) => item.str)
        .join(' ');
      textParts.push(pageText);
    }
    
    return textParts.join('\n');
  }

  /**
   * Obter número de páginas de um PDF
   */
  async getPageCount(pdf: Blob): Promise<number> {
    const pdfjsLib = await import('pdfjs-dist');
    const bytes = await pdf.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    return doc.numPages;
  }

  /**
   * Extrair página específica de PDF
   */
  async extractPage(pdf: Blob, pageNumber: number): Promise<Blob> {
    const { PDFDocument } = await import('pdf-lib');
    const bytes = await pdf.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    
    if (pageNumber < 1 || pageNumber > doc.getPageCount()) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }
    
    const newDoc = await PDFDocument.create();
    const [page] = await newDoc.copyPages(doc, [pageNumber - 1]);
    newDoc.addPage(page);
    
    const newBytes = await newDoc.save();
    return new Blob([newBytes], { type: 'application/pdf' });
  }
}

export const pdfService = new PDFService();
export default pdfService;
