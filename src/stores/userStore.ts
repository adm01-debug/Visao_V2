import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User { id: string; email: string; name: string; avatar?: string; role: string; }

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'user-store' }
  )
);

export default useUserStore;
