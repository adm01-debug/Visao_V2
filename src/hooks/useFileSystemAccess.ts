/**
 * useFileSystemAccess Hook
 * File System Access API
 */
import { useState, useCallback } from 'react';

// Ambient type declarations for File System Access API
declare global {
  interface Window {
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
  interface OpenFilePickerOptions {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }
  interface SaveFilePickerOptions {
    excludeAcceptAllOption?: boolean;
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }
  interface FileSystemFileHandle {
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }
  interface FileSystemWritableFileStream extends WritableStream {
    write(data: string | Blob | ArrayBuffer | ArrayBufferView): Promise<void>;
    close(): Promise<void>;
  }
}

export function useFileSystemAccess() {
  const [file, setFile] = useState<File | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isSupported = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  const openFile = useCallback(async (options?: OpenFilePickerOptions) => {
    if (!isSupported) { setError(new Error('Not supported')); return null; }
    try {
      const [handle] = await window.showOpenFilePicker!(options);
      const f = await handle.getFile();
      setFileHandle(handle);
      setFile(f);
      setError(null);
      return f;
    } catch (e) { if ((e as Error).name !== 'AbortError') setError(e as Error); return null; }
  }, [isSupported]);

  const saveFile = useCallback(async (content: string | Blob, options?: SaveFilePickerOptions) => {
    if (!isSupported) { setError(new Error('Not supported')); return false; }
    try {
      const handle = fileHandle || await window.showSaveFilePicker!(options);
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      setFileHandle(handle);
      setError(null);
      return true;
    } catch (e) { if ((e as Error).name !== 'AbortError') setError(e as Error); return false; }
  }, [isSupported, fileHandle]);

  return { file, fileHandle, isSupported, error, openFile, saveFile };
}
export default useFileSystemAccess;
