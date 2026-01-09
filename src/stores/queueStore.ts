// Queue Store - Projeto VISÃO
// Gerenciamento de filas com tipagem forte

import { create } from 'zustand';

export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface QueueItem<T = unknown> {
  id: string;
  type: string;
  data: T;
  status: QueueItemStatus;
  priority: number;
  retries: number;
  maxRetries: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface QueueState {
  items: QueueItem[];
  processing: boolean;
  maxConcurrent: number;
  currentProcessing: number;
}

export interface QueueActions {
  enqueue: <T>(type: string, data: T, priority?: number) => string;
  dequeue: (id: string) => void;
  process: (id: string) => void;
  complete: (id: string) => void;
  fail: (id: string, error: string) => void;
  retry: (id: string) => void;
  cancel: (id: string) => void;
  clear: () => void;
  getByStatus: (status: QueueItemStatus) => QueueItem[];
}

const initialState: QueueState = {
  items: [],
  processing: false,
  maxConcurrent: 3,
  currentProcessing: 0,
};

export const useQueueStore = create<QueueState & QueueActions>((set, get) => ({
  ...initialState,

  enqueue: <T>(type: string, data: T, priority = 0) => {
    const id = crypto.randomUUID();
    const item: QueueItem<T> = {
      id,
      type,
      data,
      status: 'pending',
      priority,
      retries: 0,
      maxRetries: 3,
      createdAt: new Date(),
    };
    set((state) => ({
      items: [...state.items, item as QueueItem].sort((a, b) => b.priority - a.priority),
    }));
    return id;
  },

  dequeue: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),

  process: (id) => set((state) => ({
    items: state.items.map((item) =>
      item.id === id ? { ...item, status: 'processing' as const, startedAt: new Date() } : item
    ),
    currentProcessing: state.currentProcessing + 1,
  })),

  complete: (id) => set((state) => ({
    items: state.items.map((item) =>
      item.id === id ? { ...item, status: 'completed' as const, completedAt: new Date() } : item
    ),
    currentProcessing: Math.max(0, state.currentProcessing - 1),
  })),

  fail: (id, error) => set((state) => ({
    items: state.items.map((item) =>
      item.id === id ? { ...item, status: 'failed' as const, error } : item
    ),
    currentProcessing: Math.max(0, state.currentProcessing - 1),
  })),

  retry: (id) => set((state) => ({
    items: state.items.map((item) =>
      item.id === id && item.retries < item.maxRetries
        ? { ...item, status: 'pending' as const, retries: item.retries + 1, error: undefined }
        : item
    ),
  })),

  cancel: (id) => set((state) => ({
    items: state.items.map((item) =>
      item.id === id ? { ...item, status: 'cancelled' as const } : item
    ),
  })),

  clear: () => set({ items: [] }),

  getByStatus: (status) => get().items.filter((item) => item.status === status),
}));
