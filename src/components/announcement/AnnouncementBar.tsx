import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ExternalLink, Megaphone } from 'lucide-react';

interface AnnouncementBarProps { message: string; link?: { text: string; url: string }; dismissible?: boolean; variant?: 'default' | 'info' | 'warning' | 'success'; className?: string; }

const variants = { default: 'bg-primary text-primary-foreground', info: 'bg-blue-500 text-white', warning: 'bg-yellow-500 text-black', success: 'bg-green-500 text-white' };

export function AnnouncementBar({ message, link, dismissible = true, variant = 'default', className }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={cn('py-2 px-4', variants[variant], className)}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
        <Megaphone className="h-4 w-4" />
        <span>{message}</span>
        {link && <a href={link.url} className="underline font-medium flex items-center gap-1">{link.text}<ExternalLink className="h-3 w-3" /></a>}
        {dismissible && <button onClick={() => setDismissed(true)} className="ml-4"><X className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

export default AnnouncementBar;
