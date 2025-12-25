import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Alert { id: string; type: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical'; timestamp: Date; read: boolean; cameraId?: string; }

interface AlertStore {
  alerts: Alert[];
  unreadCount: number;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      unreadCount: 0,
      addAlert: (alert) => set((state) => {
        const newAlert: Alert = { ...alert, id: crypto.randomUUID(), timestamp: new Date(), read: false };
        return { alerts: [newAlert, ...state.alerts], unreadCount: state.unreadCount + 1 };
      }),
      markAsRead: (id) => set((state) => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, read: true } : a),
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),
      markAllAsRead: () => set((state) => ({
        alerts: state.alerts.map(a => ({ ...a, read: true })),
        unreadCount: 0,
      })),
      removeAlert: (id) => set((state) => ({
        alerts: state.alerts.filter(a => a.id !== id),
        unreadCount: state.alerts.find(a => a.id === id && !a.read) ? state.unreadCount - 1 : state.unreadCount,
      })),
      clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
    }),
    { name: 'alert-store' }
  )
);

export default useAlertStore;
