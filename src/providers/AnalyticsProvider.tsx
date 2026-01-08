import { createContext, useContext, useEffect, ReactNode, useCallback } from 'react';
import { initAnalytics, trackEvent } from '@/lib/analytics';

interface AnalyticsContextType {
  track: (event: string, properties?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => { initAnalytics(); }, []);

  const track = useCallback((event: string, properties?: Record<string, unknown>) => {
    trackEvent(event, properties);
  }, []);

  return (
    <AnalyticsContext.Provider value={{ track }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
