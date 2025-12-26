/**
 * PWA Update Banner
 */
import React from 'react';
import { useUpdatePrompt } from '@/hooks/useUpdatePrompt';
import { RefreshCw } from 'lucide-react';
export const UpdateBanner: React.FC = () => {
  const { updateAvailable, update } = useUpdatePrompt();
  if (!updateAvailable) return null;
  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white p-3 text-center flex items-center justify-center gap-3">
      <RefreshCw className="h-5 w-5" />
      <span>Nova versão disponível!</span>
      <button onClick={update} className="px-3 py-1 bg-white text-blue-500 rounded font-medium">Atualizar</button>
    </div>
  );
};
export default UpdateBanner;
