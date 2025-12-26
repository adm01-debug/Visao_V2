/**
 * Queue Store
 */
import { create } from 'zustand';

export interface QueueItem { id: string; type: string; data: any; status: 'pending' | 'processing' | 'completed' | 'failed'; priority: number; createdAt: Date; }

interface QueueState {
  items: QueueItem[];
  isProcessing: boolean;
  enqueue: (item: Omit<QueueItem, 'id' | 'createdAt' | 'status'>) => void;
  dequeue: () => QueueItem | undefined;
  updateStatus: (id: string, status: QueueItem['status']) => void;
  clear: () => void;
  setProcessing: (processing: boolean) => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  isProcessing: false,
  enqueue: (item) => set((s) => ({ items: [...s.items, { ...item, id: crypto.randomUUID(), status: 'pending', createdAt: new Date() }].sort((a, b) => b.priority - a.priority) })),
  dequeue: () => { const item = get().items.find(i => i.status === 'pending'); if (item) set((s) => ({ items: s.items.map(i => i.id === item.id ? { ...i, status: 'processing' } : i) })); return item; },
  updateStatus: (id, status) => set((s) => ({ items: s.items.map(i => i.id === id ? { ...i, status } : i) })),
  clear: () => set({ items: [] }),
  setProcessing: (isProcessing) => set({ isProcessing }),
}));

export default useQueueStore;
