import { describe, it, expect, vi } from 'vitest';
import { readFile, writeFile, downloadFile, getFileExtension, getFileName, formatFileSize } from '../file';

describe('file utilities', () => {
  describe('getFileExtension', () => {
    it('gets file extension', () => {
      expect(getFileExtension('test.pdf')).toBe('pdf');
      expect(getFileExtension('test.tar.gz')).toBe('gz');
    });
  });

  describe('getFileName', () => {
    it('gets file name without extension', () => {
      expect(getFileName('test.pdf')).toBe('test');
    });
  });

  describe('formatFileSize', () => {
    it('formats file size', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
    });
  });

  describe('downloadFile', () => {
    it('triggers download', () => {
      const link = { click: vi.fn(), href: '', download: '' };
      vi.spyOn(document, 'createElement').mockReturnValue(link as any);
      downloadFile(new Blob(['test']), 'test.txt');
      expect(link.click).toHaveBeenCalled();
    });
  });
});
