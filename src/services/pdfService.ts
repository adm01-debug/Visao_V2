/**
 * PDF Service
 * PDF generation and manipulation
 */
export interface PDFOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: { top: number; right: number; bottom: number; left: number };
}

class PDFService {
  async generateFromHTML(html: string, options: PDFOptions = {}): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format?.toLowerCase() || 'a4',
    });
    
    // Simple HTML to PDF (for complex use html2canvas)
    const div = document.createElement('div');
    div.innerHTML = html;
    doc.text(div.textContent || '', 10, 10);
    
    return doc.output('blob');
  }

  async generateReport(data: { title: string; sections: { heading: string; content: string }[] }): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(data.title, 20, 20);
    
    let y = 40;
    data.sections.forEach(section => {
      doc.setFontSize(14);
      doc.text(section.heading, 20, y);
      y += 10;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(section.content, 170);
      doc.text(lines, 20, y);
      y += lines.length * 5 + 10;
    });
    
    return doc.output('blob');
  }

  async mergePDFs(pdfs: Blob[]): Promise<Blob> {
    const { PDFDocument } = await import('pdf-lib');
    const merged = await PDFDocument.create();
    
    for (const pdf of pdfs) {
      const bytes = await pdf.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => merged.addPage(page));
    }
    
    const bytes = await merged.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async extractText(pdf: Blob): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    const bytes = await pdf.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  }
}

export const pdfService = new PDFService();
export default pdfService;
