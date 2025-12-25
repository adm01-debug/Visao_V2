type StorageType = 'local' | 'session';

class StorageService {
  private getStorage(type: StorageType): Storage {
    return type === 'local' ? localStorage : sessionStorage;
  }

  set<T>(key: string, value: T, type: StorageType = 'local'): void {
    try {
      this.getStorage(type).setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  get<T>(key: string, defaultValue: T, type: StorageType = 'local'): T {
    try {
      const item = this.getStorage(type).getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  remove(key: string, type: StorageType = 'local'): void {
    this.getStorage(type).removeItem(key);
  }

  clear(type: StorageType = 'local'): void {
    this.getStorage(type).clear();
  }

  has(key: string, type: StorageType = 'local'): boolean {
    return this.getStorage(type).getItem(key) !== null;
  }

  keys(type: StorageType = 'local'): string[] {
    const storage = this.getStorage(type);
    return Array.from({ length: storage.length }, (_, i) => storage.key(i)!);
  }

  getSize(type: StorageType = 'local'): number {
    const storage = this.getStorage(type);
    let size = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)!;
      size += (storage.getItem(key)?.length || 0) + key.length;
    }
    return size;
  }
}

export const storageService = new StorageService();
export default storageService;
