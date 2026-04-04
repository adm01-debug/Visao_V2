/**
 * useFileSystemAccess Hook
 * File System Access API
 */
import { useState, useCallback } from 'react';

// Re-declare minimal types needed (full declarations in src/types/file-system-access.d.ts)
interface FSAOpenOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: { description?: string; accept: Record<string, string | string[]> }[];
}
interface FSASaveOptions {
  excludeAcceptAllOption?: boolean;
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string | string[]> }[];
}
interface FSAFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }>;
}

export function useFileSystemAccess() {
  const [file, setFile] = useState<File | null>(null);
  const [fileHandle, setFileHandle] = useState<FSAFileHandle | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isSupported = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  const openFile = useCallback(async (options?: FSAOpenOptions) => {
    if (!isSupported) { setError(new Error('Not supported')); return null; }
    try {
      const picker = (window as unknown as { showOpenFilePicker(o?: FSAOpenOptions): Promise<FSAFileHandle[]> }).showOpenFilePicker;
      const [handle] = await picker(options);
      const f = await handle!.getFile();
      setFileHandle(handle!);
      setFile(f);
      setError(null);
      return f;
    } catch (e) { if ((e as Error).name !== 'AbortError') setError(e as Error); return null; }
  }, [isSupported]);

  const saveFile = useCallback(async (content: string | Blob, options?: FSASaveOptions) => {
    if (!isSupported) { setError(new Error('Not supported')); return false; }
    try {
      const picker = (window as unknown as { showSaveFilePicker(o?: FSASaveOptions): Promise<FSAFileHandle> }).showSaveFilePicker;
      const handle = fileHandle || await picker(options);
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
