class ImportService {
  async importJSON<T>(file: File): Promise<T> {
    const text = await file.text();
    return JSON.parse(text);
  }

  async importCSV(file: File): Promise<Record<string, string>[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] || '' }), {});
    });
  }

  async importText(file: File): Promise<string> {
    return file.text();
  }

  async importImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  validateFileSize(file: File, maxSizeBytes: number): boolean {
    return file.size <= maxSizeBytes;
  }
}

export const importService = new ImportService();
export default importService;
