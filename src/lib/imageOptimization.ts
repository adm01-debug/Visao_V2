/**
 * VISÃO - Image Optimization Utility
 * Compresses images before upload to save bandwidth and storage
 */

import imageCompression from 'browser-image-compression';
import { logger } from './logger';

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

const defaultOptions: CompressionOptions = {
  maxSizeMB: 0.5, // 500KB
  maxWidthOrHeight: 1280,
  useWebWorker: true,
};

/**
 * Compresses an image file or base64 string
 */
export async function optimizeImage(
  input: File | string,
  options: CompressionOptions = {}
): Promise<File | string> {
  const opts = { ...defaultOptions, ...options };

  try {
    let file: File;

    if (typeof input === 'string') {
      // If base64, convert to File
      const response = await fetch(input);
      const blob = await response.blob();
      file = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' });
    } else {
      file = input;
    }

    if (file.size < opts.maxSizeMB! * 1024 * 1024) {
      return input; // Already small enough
    }

    const compressedFile = await imageCompression(file, opts);

    if (typeof input === 'string') {
      // Convert back to base64 if input was base64
      return await imageCompression.getDataUrlFromFile(compressedFile);
    }

    return compressedFile;
  } catch (error) {
    logger.error('Image compression failed:', error);
    return input; // Fallback to original
  }
}
