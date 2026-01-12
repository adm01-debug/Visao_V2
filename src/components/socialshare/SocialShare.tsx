import React from 'react';
import { cn } from '@/lib/utils';
import { Share2 } from 'lucide-react';

interface SocialShareProps {
  url: string;
  title?: string;
  platforms?: ('twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram')[];
  className?: string;
}

const platformConfig = {
  twitter: { name: 'Twitter', color: 'bg-[#1DA1F2]', url: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
  facebook: { name: 'Facebook', color: 'bg-[#4267B2]', url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  linkedin: { name: 'LinkedIn', color: 'bg-[#0077B5]', url: (u: string, t: string) => `https://www.linkedin.com/shareArticle?mini=true&url=${u}&title=${t}` },
  whatsapp: { name: 'WhatsApp', color: 'bg-[#25D366]', url: (u: string, t: string) => `https://wa.me/?text=${t} ${u}` },
  telegram: { name: 'Telegram', color: 'bg-[#0088cc]', url: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}` },
};

export function SocialShare({ url, title = '', platforms = ['twitter', 'facebook', 'linkedin', 'whatsapp'], className }: SocialShareProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Share2 className="h-4 w-4 text-muted-foreground" />
      {platforms.map(p => (
        <a key={p} href={platformConfig[p].url(encodedUrl, encodedTitle)} target="_blank" rel="noopener noreferrer"
          className={cn('px-3 py-1.5 rounded text-white text-xs font-medium hover:opacity-90', platformConfig[p].color)}>
          {platformConfig[p].name}
        </a>
      ))}
    </div>
  );
}

export default SocialShare;
