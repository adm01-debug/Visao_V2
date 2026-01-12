import React from 'react';
import { cn } from '@/lib/utils';
import { WifiOff, Wifi } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline?: boolean;
  showWhenOnline?: boolean;
  className?: string;
}

export function OfflineIndicator({ isOnline = navigator.onLine, showWhenOnline = false, className }: OfflineIndicatorProps) {
  const [online, setOnline] = React.useState(isOnline);

  React.useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  if (online && !showWhenOnline) return null;

  return (
    <div className={cn('fixed bottom-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg z-50',
      online ? 'bg-green-500 text-white' : 'bg-red-500 text-white', className)}>
      {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <span className="text-sm font-medium">{online ? 'Online' : 'Offline'}</span>
    </div>
  );
}

export default OfflineIndicator;
