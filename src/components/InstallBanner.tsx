/**
 * PWA Install Banner
 */
import React from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Download, X } from 'lucide-react';
export const InstallBanner: React.FC<{ onDismiss?: () => void }> = ({ onDismiss }) => {
  const { isInstallable, install } = useInstallPrompt();
  if (!isInstallable) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex items-center gap-3">
      <Download className="h-6 w-6" />
      <div className="flex-1"><p className="font-medium">Instalar App</p><p className="text-sm opacity-90">Acesse offline e receba notificações</p></div>
      <button onClick={install} className="px-3 py-1 bg-white text-primary rounded">Instalar</button>
      <button onClick={onDismiss} className="p-1"><X className="h-5 w-5" /></button>
    </div>
  );
};
export default InstallBanner;
