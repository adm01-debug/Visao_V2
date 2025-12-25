import { saveAs } from 'file-saver';

class ExportService {
  exportJSON<T>(data: T, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `${filename}.json`);
  }

  exportCSV<T extends Record<string, any>>(data: T[], filename: string, columns?: string[]): void {
    if (data.length === 0) return;
    
    const headers = columns || Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${filename}.csv`);
  }

  exportText(text: string, filename: string): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${filename}.txt`);
  }

  async exportImage(element: HTMLElement, filename: string): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element);
    canvas.toBlob(blob => blob && saveAs(blob, `${filename}.png`));
  }

  downloadURL(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }
}

export const exportService = new ExportService();
export default exportService;
