import { create } from 'zustand';

interface Notification { id: string; title: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; duration?: number; }

interface NotificationStore {
  notifications: Notification[];
  add: (notification: Omit<Notification, 'id'>) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  add: (notification) => {
    const id = crypto.randomUUID();
    set((state) => ({ notifications: [...state.notifications, { ...notification, id }] }));
    if (notification.duration !== 0) {
      setTimeout(() => set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) })), notification.duration || 5000);
    }
    return id;
  },
  remove: (id) => set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) })),
  clear: () => set({ notifications: [] }),
}));

export default useNotificationStore;
