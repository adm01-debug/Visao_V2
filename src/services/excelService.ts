/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Excel Service - Geração e leitura de planilhas
 * 
 * @module services/excelService
 */

// ============================================
// TIPOS
// ============================================

export interface CellStyle {
  numFmt?: string;
  font?: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    color?: { argb: string };
  };
  fill?: {
    type: 'pattern';
    pattern: 'solid';
    fgColor: { argb: string };
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
}

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  style?: CellStyle;
}

export interface SheetData {
  name: string;
  columns: ExcelColumn[];
  data: Record<string, unknown>[];
}

export interface ParsedSheet {
  name: string;
  data: Record<string, unknown>[];
}

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  includeHeaders?: boolean;
}

// ============================================
// SERVICE
// ============================================

class ExcelService {
  /**
   * Criar workbook com múltiplas planilhas
   */
  async createWorkbook(sheets: SheetData[]): Promise<Blob> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'VISÃO';
    workbook.created = new Date();
    
    sheets.forEach((sheet) => {
      const ws = workbook.addWorksheet(sheet.name);
      
      // Configurar colunas
      ws.columns = sheet.columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width || 15,
      }));
      
      // Adicionar dados
      sheet.data.forEach((row) => ws.addRow(row));
      
      // Estilizar cabeçalho
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      
      // Aplicar estilos personalizados às colunas
      sheet.columns.forEach((col, index) => {
        if (col.style) {
          const column = ws.getColumn(index + 1);
          if (col.style.numFmt) {
            column.numFmt = col.style.numFmt;
          }
        }
      });
      
      // Congelar cabeçalho
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /**
   * Criar planilha simples
   */
  async createSheet(
    data: Record<string, unknown>[],
    options: ExportOptions = {}
  ): Promise<Blob> {
    if (!data.length) {
      throw new Error('Data array is empty');
    }
    
    const headers = Object.keys(data[0]);
    const columns: ExcelColumn[] = headers.map((key) => ({
      header: key,
      key,
      width: Math.max(key.length, 10) + 5,
    }));
    
    return this.createWorkbook([
      {
        name: options.sheetName || 'Sheet1',
        columns,
        data,
      },
    ]);
  }

  /**
   * Ler workbook de arquivo
   */
  async readWorkbook(file: File): Promise<ParsedSheet[]> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    
    return workbook.worksheets.map((ws) => {
      const headers: string[] = [];
      const data: Record<string, unknown>[] = [];
      
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Extrair cabeçalhos
          row.eachCell((cell, colNumber) => {
            headers[colNumber] = String(cell.value ?? '');
          });
        } else {
          // Extrair dados
          const rowData: Record<string, unknown> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
              rowData[header] = cell.value;
            }
          });
          data.push(rowData);
        }
      });
      
      return { name: ws.name, data };
    });
  }

  /**
   * Exportar dados para CSV
   */
  async exportToCSV(
    data: Record<string, unknown>[],
    filename = 'export.csv'
  ): Promise<void> {
    if (!data.length) {
      throw new Error('Data array is empty');
    }
    
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => {
        const value = row[h];
        const str = value === null || value === undefined ? '' : String(value);
        // Escapar aspas e valores com vírgulas
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); // BOM para Excel
    
    this.downloadBlob(blob, filename);
  }

  /**
   * Download de arquivo Excel
   */
  async downloadExcel(
    data: Record<string, unknown>[],
    filename = 'export.xlsx'
  ): Promise<void> {
    const blob = await this.createSheet(data);
    this.downloadBlob(blob, filename);
  }

  /**
   * Helper para download de blob
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Converter CSV para array de objetos
   */
  parseCSV(csvContent: string): Record<string, string>[] {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];
    
    const headers = this.parseCSVLine(lines[0]);
    const data: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    
    return data;
  }

  /**
   * Parser de linha CSV (suporta aspas)
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}

export const excelService = new ExcelService();
export default excelService;
