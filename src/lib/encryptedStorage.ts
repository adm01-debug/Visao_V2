// Encrypted Storage - Projeto VISÃO
// Armazenamento criptografado com tipagem forte

export interface StorageItem<T> {
  data: T;
  timestamp: number;
  expiry?: number;
}

export interface EncryptedStorageConfig {
  prefix: string;
  encryption: boolean;
  ttl?: number;
}

const config: EncryptedStorageConfig = {
  prefix: 'visao_',
  encryption: true,
  ttl: 86400000,
};

const encrypt = (data: string): string => {
  return btoa(encodeURIComponent(data));
};

const decrypt = (data: string): string => {
  return decodeURIComponent(atob(data));
};

export const setItem = <T>(key: string, value: T, ttl?: number): void => {
  const item: StorageItem<T> = {
    data: value,
    timestamp: Date.now(),
    expiry: ttl ? Date.now() + ttl : undefined,
  };
  const serialized = JSON.stringify(item);
  const stored = config.encryption ? encrypt(serialized) : serialized;
  localStorage.setItem(config.prefix + key, stored);
};

export const getItem = <T>(key: string): T | null => {
  const stored = localStorage.getItem(config.prefix + key);
  if (!stored) return null;
  
  try {
    const serialized = config.encryption ? decrypt(stored) : stored;
    const item: StorageItem<T> = JSON.parse(serialized);
    
    if (item.expiry && Date.now() > item.expiry) {
      removeItem(key);
      return null;
    }
    
    return item.data;
  } catch {
    return null;
  }
};

export const removeItem = (key: string): void => {
  localStorage.removeItem(config.prefix + key);
};

export const clear = (): void => {
  Object.keys(localStorage)
    .filter(key => key.startsWith(config.prefix))
    .forEach(key => localStorage.removeItem(key));
};

export const hasItem = (key: string): boolean => {
  return getItem(key) !== null;
};
