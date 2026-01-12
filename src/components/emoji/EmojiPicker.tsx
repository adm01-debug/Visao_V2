import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Smile } from 'lucide-react';

interface EmojiPickerProps { onSelect: (emoji: string) => void; className?: string; }

const emojis = ['😀','😂','😍','🥳','😎','🤔','😢','😡','👍','👎','❤️','🔥','⭐','🎉','💯','🙏','👋','✨','💪','🚀'];

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <button onClick={() => setOpen(!open)} className="p-2 rounded hover:bg-accent"><Smile className="h-5 w-5" /></button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 p-2 bg-popover border rounded-lg shadow-lg grid grid-cols-5 gap-1 z-50">
          {emojis.map(e => <button key={e} onClick={() => { onSelect(e); setOpen(false); }} className="text-xl p-1 hover:bg-accent rounded">{e}</button>)}
        </div>
      )}
    </div>
  );
}

export default EmojiPicker;
