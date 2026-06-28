/**
 * VISÃO - useUnsavedChanges Hook
 * Warns user before navigating away if there are unsaved changes
 */

import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedChanges(isDirty: boolean) {
  // Warn before browser tab/window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Trigger browser confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Block react-router navigation
  useBlocker(({ nextLocation }) => {
    if (isDirty && nextLocation.pathname !== window.location.pathname) {
      // In a real app, we might show a custom modal here.
      // For now, we use the standard browser confirm via window.confirm
      // since react-router's useBlocker doesn't easily show a Radix UI Dialog 
      // without some extra orchestration.
      return !window.confirm('Você tem alterações não salvas. Deseja realmente sair?');
    }
    return false;
  });
}
