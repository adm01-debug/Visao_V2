const OFFLINE_QUEUE_KEY = 'offline_queue';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  timestamp: number;
}

export const isOnline = (): boolean => navigator.onLine;

export const addToOfflineQueue = (request: Omit<QueuedRequest, 'id' | 'timestamp'>): void => {
  const queue = getOfflineQueue();
  queue.push({
    ...request,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const getOfflineQueue = (): QueuedRequest[] => {
  const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearOfflineQueue = (): void => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

export const processOfflineQueue = async (): Promise<void> => {
  if (!isOnline()) return;
  const queue = getOfflineQueue();
  for (const request of queue) {
    try {
      await fetch(request.url, { method: request.method, body: request.body });
    } catch {
}
  }
  clearOfflineQueue();
};

export const setupOfflineSync = (): void => {
  window.addEventListener('online', processOfflineQueue);
};
