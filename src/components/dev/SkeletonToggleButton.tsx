import { useEffect, useState } from 'react';
import { Layers, LayersIcon } from 'lucide-react';
import { useSkeletonToggle } from '@/contexts/SkeletonToggleContext';
import { cn } from '@/lib/utils';

/**
 * Floating dev/QA toggle for enabling/disabling skeleton placeholders.
 * Visible in DEV mode or when ?debug=skeletons is present in the URL.
 */
export function SkeletonToggleButton() {
  const { skeletonsEnabled, toggleSkeletons } = useSkeletonToggle();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const hasFlag =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('debug') === 'skeletons';
    setVisible(Boolean(isDev || hasFlag));
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={toggleSkeletons}
      aria-pressed={skeletonsEnabled}
      aria-label={skeletonsEnabled ? 'Desativar skeletons' : 'Ativar skeletons'}
      title={skeletonsEnabled ? 'Skeletons: ON (clique para desligar)' : 'Skeletons: OFF (clique para ligar)'}
      className={cn(
        'fixed z-[60] bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full',
        'text-xs font-medium shadow-lg border transition-colors',
        'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground',
        skeletonsEnabled ? 'ring-2 ring-primary/40' : 'opacity-80'
      )}
    >
      <Layers className="h-4 w-4" aria-hidden="true" />
      <span>Skeletons: {skeletonsEnabled ? 'ON' : 'OFF'}</span>
    </button>
  );
}

export default SkeletonToggleButton;
