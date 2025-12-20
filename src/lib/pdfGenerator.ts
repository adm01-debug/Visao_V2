/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utilitário: Gerador de Relatórios em PDF
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReportData {
  title: string;
  subtitle?: string;
  dateRange: { start: Date; end: Date };
  generatedAt: Date;
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  type: 'table' | 'chart' | 'summary' | 'text';
  data: any;
}

export interface TableRow {
  [key: string]: string | number | boolean;
}

// Cores do tema
const COLORS = {
  primary: [59, 130, 246] as const,    // blue-500
  secondary: [100, 116, 139] as const, // slate-500
  success: [34, 197, 94] as const,     // green-500
  warning: [234, 179, 8] as const,     // yellow-500
  danger: [239, 68, 68] as const,      // red-500
  dark: [30, 41, 59] as const,         // slate-800
  light: [248, 250, 252] as const,     // slate-50
};

/**
 * Gera um PDF a partir de dados estruturados
 */
export async function generatePDFReport(data: ReportData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('VISÃO', margin, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Vigilância Inteligente', margin, 28);
  
  // Data de geração
  doc.setFontSize(8);
  doc.text(
    `Gerado em: ${data.generatedAt.toLocaleString('pt-BR')}`,
    pageWidth - margin,
    28,
    { align: 'right' }
  );

  yPosition = 50;

  // Título do relatório
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, margin, yPosition);
  yPosition += 8;

  if (data.subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);
    doc.text(data.subtitle, margin, yPosition);
    yPosition += 6;
  }

  // Período
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.secondary);
  const periodText = `Período: ${data.dateRange.start.toLocaleDateString('pt-BR')} - ${data.dateRange.end.toLocaleDateString('pt-BR')}`;
  doc.text(periodText, margin, yPosition);
  yPosition += 12;

  // Linha separadora
  doc.setDrawColor(...COLORS.secondary);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Processar seções
  for (const section of data.sections) {
    // Verificar se precisa nova página
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // Título da seção
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, yPosition);
    yPosition += 8;

    switch (section.type) {
      case 'summary':
        yPosition = renderSummary(doc, section.data, margin, yPosition, pageWidth);
        break;
      case 'table':
        yPosition = renderTable(doc, section.data, margin, yPosition, pageWidth, pageHeight);
        break;
      case 'text':
        yPosition = renderText(doc, section.data, margin, yPosition, pageWidth);
        break;
    }

    yPosition += 10;
  }

  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'VISÃO - Relatório Confidencial',
      margin,
      pageHeight - 10
    );
  }

  return doc;
}

/**
 * Renderiza um resumo com cards de métricas
 */
function renderSummary(
  doc: jsPDF,
  data: { label: string; value: string | number; color?: string }[],
  margin: number,
  yPosition: number,
  pageWidth: number
): number {
  const cardWidth = (pageWidth - margin * 2 - 10 * (data.length - 1)) / Math.min(data.length, 4);
  const cardHeight = 25;
  
  let xPosition = margin;
  let currentY = yPosition;
  let itemsInRow = 0;

  data.forEach((item, index) => {
    if (itemsInRow >= 4) {
      xPosition = margin;
      currentY += cardHeight + 5;
      itemsInRow = 0;
    }

    // Card background
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(xPosition, currentY, cardWidth, cardHeight, 2, 2, 'F');

    // Valor
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.value), xPosition + cardWidth / 2, currentY + 10, { align: 'center' });

    // Label
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, xPosition + cardWidth / 2, currentY + 18, { align: 'center' });

    xPosition += cardWidth + 10;
    itemsInRow++;
  });

  return currentY + cardHeight + 5;
}

/**
 * Renderiza uma tabela
 */
function renderTable(
  doc: jsPDF,
  data: { headers: string[]; rows: (string | number)[][] },
  margin: number,
  yPosition: number,
  pageWidth: number,
  pageHeight: number
): number {
  const { headers, rows } = data;
  const colWidth = (pageWidth - margin * 2) / headers.length;
  const rowHeight = 8;
  let currentY = yPosition;

  // Header da tabela
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  headers.forEach((header, i) => {
    doc.text(header, margin + i * colWidth + 2, currentY + 5.5);
  });
  
  currentY += rowHeight;

  // Linhas da tabela
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  rows.forEach((row, rowIndex) => {
    // Verificar se precisa nova página
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
      
      // Repetir header
      doc.setFillColor(...COLORS.primary);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth + 2, currentY + 5.5);
      });
      currentY += rowHeight;
      doc.setTextColor(...COLORS.dark);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    // Alternar cor de fundo
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
    }

    // Borda inferior
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    row.forEach((cell, i) => {
      const text = String(cell).substring(0, 25);
      doc.text(text, margin + i * colWidth + 2, currentY + 5.5);
    });

    currentY += rowHeight;
  });

  return currentY;
}

/**
 * Renderiza texto simples
 */
function renderText(
  doc: jsPDF,
  data: string,
  margin: number,
  yPosition: number,
  pageWidth: number
): number {
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const lines = doc.splitTextToSize(data, pageWidth - margin * 2);
  doc.text(lines, margin, yPosition);
  
  return yPosition + lines.length * 5;
}

/**
 * Captura um elemento HTML e adiciona ao PDF
 */
export async function captureElementToPDF(
  element: HTMLElement,
  doc: jsPDF,
  yPosition: number
): Promise<number> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);

  return yPosition + imgHeight + 10;
}

/**
 * Download do PDF
 */
export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}
