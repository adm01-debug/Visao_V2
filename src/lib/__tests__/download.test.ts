import { describe, it, expect, vi } from 'vitest';
import { downloadBlob, downloadUrl, downloadJson, downloadCsv } from '../download';

describe('download utilities', () => {
  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: vi.fn(),
      href: '',
      download: '',
      style: {},
    } as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));
  });

  describe('downloadBlob', () => {
    it('downloads blob as file', () => {
      downloadBlob(new Blob(['test']), 'test.txt');
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('downloadUrl', () => {
    it('downloads from URL', () => {
      downloadUrl('https://test.com/file.pdf', 'file.pdf');
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('downloadJson', () => {
    it('downloads JSON data', () => {
      downloadJson({ a: 1 }, 'data.json');
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('downloadCsv', () => {
    it('downloads CSV data', () => {
      downloadCsv([['a', 'b'], ['1', '2']], 'data.csv');
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });
});
