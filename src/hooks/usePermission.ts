import { useState, useEffect } from 'react';

type PermissionName = 'geolocation' | 'notifications' | 'camera' | 'microphone' | 'clipboard-read' | 'clipboard-write';

interface UsePermissionState {
  state: PermissionState | 'unsupported';
  isGranted: boolean;
  isDenied: boolean;
  isPrompt: boolean;
}

export const usePermission = (permissionName: PermissionName): UsePermissionState => {
  const [state, setState] = useState<PermissionState | 'unsupported'>('prompt');

  useEffect(() => {
    if (!navigator.permissions) {
      setState('unsupported');
      return;
    }

    let mounted = true;

    navigator.permissions
      .query({ name: permissionName as PermissionName })
      .then((permissionStatus) => {
        if (mounted) {
          setState(permissionStatus.state);
          
          permissionStatus.onchange = () => {
            if (mounted) setState(permissionStatus.state);
          };
        }
      })
      .catch(() => {
        if (mounted) setState('unsupported');
      });

    return () => { mounted = false; };
  }, [permissionName]);

  return {
    state,
    isGranted: state === 'granted',
    isDenied: state === 'denied',
    isPrompt: state === 'prompt',
  };
};

export default usePermission;
