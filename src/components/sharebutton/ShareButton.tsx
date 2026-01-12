import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Share2, Link, Mail, MessageSquare, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareButtonProps {
  url: string;
  title?: string;
  onShare?: (method: string) => void;
  className?: string;
}

export function ShareButton({ url, title = '', onShare, className }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShare?.('copy');
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`);
    onShare?.('email');
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`);
    onShare?.('whatsapp');
  };

  return (
    <div className={cn('relative', className)}>
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)}>
        <Share2 className="h-4 w-4 mr-2" />
        Compartilhar
      </Button>
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-popover border rounded-lg shadow-lg z-50 p-2 min-w-[160px]">
          <button onClick={copyLink} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button onClick={shareEmail} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded">
            <Mail className="h-4 w-4" />Email
          </button>
          <button onClick={shareWhatsApp} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded">
            <MessageSquare className="h-4 w-4" />WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}

export default ShareButton;
