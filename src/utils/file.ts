export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(1)} ${units[i]}`;
};

export const getFileExtension = (filename: string): string => filename.split('.').pop()?.toLowerCase() || '';
export const getFileName = (path: string): string => path.split('/').pop() || path;
export const getFileNameWithoutExtension = (filename: string): string => filename.replace(/\.[^/.]+$/, '');

export const isImage = (filename: string): boolean => /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(filename);
export const isVideo = (filename: string): boolean => /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(filename);
export const isAudio = (filename: string): boolean => /\.(mp3|wav|ogg|aac|flac)$/i.test(filename);
export const isPDF = (filename: string): boolean => /\.pdf$/i.test(filename);

export const readFileAsText = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsText(file); });
export const readFileAsDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(file); });
