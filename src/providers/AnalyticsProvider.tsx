import { createContext, useContext, useEffect, ReactNode } from 'react';
import { initAnalytics } from '@/lib/analytics';
const AnalyticsContext = createContext<null>(null);
export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => { initAnalytics(); }, []);
  return <AnalyticsContext.Provider value={null}>{children}</AnalyticsContext.Provider>;
};
