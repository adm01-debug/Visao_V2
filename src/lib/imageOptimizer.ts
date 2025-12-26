/**
 * Image Optimizer
 */
export async function optimizeImage(file: File, options?: { maxWidth?: number; maxHeight?: number; quality?: number }): Promise<Blob> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options || {};
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise(r => img.onload = r);
  let { width, height } = img;
  if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
  if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);
  return new Promise(r => canvas.toBlob(b => r(b!), 'image/webp', quality));
}
export function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths.map(w => `${baseUrl}?w=${w} ${w}w`).join(', ');
}
