/**
 * Hotkeys Visualizer
 */
import React, { useState, useEffect } from 'react';
import { Command } from 'lucide-react';
export interface Hotkey { keys: string[]; description: string; category?: string; }
export const Hotkeys: React.FC<{ hotkeys: Hotkey[]; trigger?: string }> = ({ hotkeys, trigger = '?' }) => {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === trigger) setIsOpen(o => !o); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [trigger]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
      <div className="bg-background rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold flex items-center gap-2"><Command className="h-5 w-5" /> Atalhos de Teclado</h2>
        <div className="mt-4 space-y-3">
          {hotkeys.map((h, i) => (
            <div key={i} className="flex items-center justify-between">
              <span>{h.description}</span>
              <div className="flex gap-1">{h.keys.map((k, j) => <kbd key={j} className="px-2 py-1 bg-muted rounded text-sm font-mono">{k}</kbd>)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Hotkeys;
