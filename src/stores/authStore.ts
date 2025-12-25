import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  setTokens: (token: string, refreshToken: string, expiresIn: number) => void;
  clearTokens: () => void;
  isExpired: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      setTokens: (token, refreshToken, expiresIn) => set({
        token,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
      }),
      clearTokens: () => set({ token: null, refreshToken: null, expiresAt: null }),
      isExpired: () => {
        const { expiresAt } = get();
        return !expiresAt || Date.now() > expiresAt;
      },
    }),
    { name: 'auth-store' }
  )
);

export default useAuthStore;
