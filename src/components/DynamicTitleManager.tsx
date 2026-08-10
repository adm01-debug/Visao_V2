/**
 * VISÃO - Dynamic Title Manager
 * Updates the document title based on application state (e.g., active alerts)
 */

import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

export function DynamicTitleManager() {
  const { unreadAlertsCount } = useNotifications();

  useEffect(() => {
    const baseTitle = 'VISÃO - Vigilância Inteligente';

    if (unreadAlertsCount > 0) {
      document.title = `(${unreadAlertsCount}) Alertas | ${baseTitle}`;

      // Favicon notification (optional, but premium)
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        // Here we could swap to a red dot version of favicon
      }
    } else {
      // document.title = baseTitle; // PageMeta will handle this, but let's reset if needed
    }
  }, [unreadAlertsCount]);

  return null;
}
