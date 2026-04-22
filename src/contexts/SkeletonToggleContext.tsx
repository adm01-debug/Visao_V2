import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'visao:skeletons-enabled';

interface SkeletonToggleContextValue {
  skeletonsEnabled: boolean;
  toggleSkeletons: () => void;
  setSkeletonsEnabled: (v: boolean) => void;
}

const SkeletonToggleContext = createContext<SkeletonToggleContextValue | undefined>(undefined);

export function SkeletonToggleProvider({ children }: { children: React.ReactNode }) {
  const [skeletonsEnabled, setSkeletonsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(skeletonsEnabled));
    } catch {
      /* ignore */
    }
  }, [skeletonsEnabled]);

  const toggleSkeletons = useCallback(() => setSkeletonsEnabled((v) => !v), []);

  return (
    <SkeletonToggleContext.Provider value={{ skeletonsEnabled, toggleSkeletons, setSkeletonsEnabled }}>
      {children}
    </SkeletonToggleContext.Provider>
  );
}

export function useSkeletonToggle(): SkeletonToggleContextValue {
  const ctx = useContext(SkeletonToggleContext);
  if (!ctx) {
    return { skeletonsEnabled: true, toggleSkeletons: () => {}, setSkeletonsEnabled: () => {} };
  }
  return ctx;
}
