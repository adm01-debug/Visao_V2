import { useCallback } from 'react';
import { trackEvent, trackPageView } from '@/lib/analytics';

export const useAnalytics = () => {
  const track = useCallback((event: string, properties?: Record<string, unknown>) => {
    trackEvent(event, properties);
  }, []);

  const page = useCallback((path: string, title?: string) => {
    trackPageView(path, title);
  }, []);

  return { track, page };
};
