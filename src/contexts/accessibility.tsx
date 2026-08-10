/**
 * VISÃO - Acessibilidade (ARIA) - Refactored
 * Main context and provider, with components and hooks extracted to submodules.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// Re-export all submodules
export {
  SkipLinks,
  VisuallyHidden,
  FocusTrap,
  Landmark,
  LiveRegion,
  HeadingSection,
  AutoHeading,
} from './a11y/components';
export { useKeyboardNavigation, useFocusManagement } from './a11y/hooks';
export { accessibilityStyles } from './a11y/styles';

// ============================================
// TIPOS
// ============================================

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

export interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: Date;
}

// ============================================
// CONTEXT
// ============================================

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announcements: Announcement[];
  clearAnnouncements: () => void;
  focusMain: () => void;
  focusElement: (selector: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    const defaults: AccessibilityPreferences = {
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: more)').matches,
      largeText: false,
      screenReaderMode: false,
      keyboardNavigation: true,
      focusIndicators: true,
    };
    const saved = localStorage.getItem('visao-a11y-preferences');
    if (!saved) return defaults;
    try {
      return { ...defaults, ...JSON.parse(saved) };
    } catch {
      return defaults;
    }
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    localStorage.setItem('visao-a11y-preferences', JSON.stringify(preferences));
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', preferences.reduceMotion);
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('large-text', preferences.largeText);
    root.classList.toggle('keyboard-navigation', preferences.keyboardNavigation);
  }, [preferences]);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    const handleMotion = (e: MediaQueryListEvent) =>
      setPreferences((prev) => ({ ...prev, reduceMotion: e.matches }));
    const handleContrast = (e: MediaQueryListEvent) =>
      setPreferences((prev) => ({ ...prev, highContrast: e.matches }));
    motionQuery.addEventListener('change', handleMotion);
    contrastQuery.addEventListener('change', handleContrast);
    return () => {
      motionQuery.removeEventListener('change', handleMotion);
      contrastQuery.removeEventListener('change', handleContrast);
    };
  }, []);

  const updatePreferences = useCallback((updates: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement: Announcement = {
      id: `announcement-${Date.now()}`,
      message,
      priority,
      timestamp: new Date(),
    };
    setAnnouncements((prev) => [...prev, announcement]);
    setTimeout(() => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
    }, 5000);
  }, []);

  const clearAnnouncements = useCallback(() => setAnnouncements([]), []);
  const focusMain = useCallback(() => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main instanceof HTMLElement) main.focus();
  }, []);
  const focusElement = useCallback((selector: string) => {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) el.focus();
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        preferences,
        updatePreferences,
        announce,
        announcements,
        clearAnnouncements,
        focusMain,
        focusElement,
      }}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcements
          .filter((a) => a.priority === 'polite')
          .map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcements
          .filter((a) => a.priority === 'assertive')
          .map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      {children}
    </AccessibilityContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
}

export default useAccessibility;
