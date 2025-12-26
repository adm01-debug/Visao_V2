/**
 * Excel Service
 * Spreadsheet generation
 */
export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  style?: { numFmt?: string; font?: any; fill?: any };
}

class ExcelService {
  async createWorkbook(sheets: { name: string; columns: ExcelColumn[]; data: Record<string, any>[] }[]): Promise<Blob> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    sheets.forEach(sheet => {
      const ws = workbook.addWorksheet(sheet.name);
      ws.columns = sheet.columns.map(col => ({ header: col.header, key: col.key, width: col.width || 15 }));
      sheet.data.forEach(row => ws.addRow(row));
      
      // Style header
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  async readWorkbook(file: File): Promise<{ name: string; data: Record<string, any>[] }[]> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    
    return workbook.worksheets.map(ws => {
      const headers: string[] = [];
      const data: Record<string, any>[] = [];
      
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell, colNumber) => { headers[colNumber] = String(cell.value); });
        } else {
          const rowData: Record<string, any> = {};
          row.eachCell((cell, colNumber) => { rowData[headers[colNumber]] = cell.value; });
          data.push(rowData);
        }
      });
      
      return { name: ws.name, data };
    });
  }

  async exportToCSV(data: Record<string, any>[], filename = 'export.csv'): Promise<void> {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const excelService = new ExcelService();
export default excelService;
