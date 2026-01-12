import { describe, it, expect } from 'vitest';
import { formatFileSize, getFileExtension, isImageFile, isVideoFile } from '../fileUtils';

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});

describe('getFileExtension', () => {
  it('extracts extension', () => {
    expect(getFileExtension('file.txt')).toBe('txt');
    expect(getFileExtension('file.tar.gz')).toBe('gz');
    expect(getFileExtension('file')).toBe('');
  });
});

describe('isImageFile', () => {
  it('identifies image files', () => {
    expect(isImageFile('photo.jpg')).toBe(true);
    expect(isImageFile('photo.png')).toBe(true);
    expect(isImageFile('document.pdf')).toBe(false);
  });
});

describe('isVideoFile', () => {
  it('identifies video files', () => {
    expect(isVideoFile('video.mp4')).toBe(true);
    expect(isVideoFile('photo.jpg')).toBe(false);
  });
});
