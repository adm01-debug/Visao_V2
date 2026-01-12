import React from 'react';
import { cn } from '@/lib/utils';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Github } from 'lucide-react';

interface SocialMediaLinksProps { links: { platform: string; url: string }[]; size?: 'sm' | 'md' | 'lg'; className?: string; }

const icons: Record<string, React.ComponentType<{ className?: string }>> = { facebook: Facebook, twitter: Twitter, instagram: Instagram, linkedin: Linkedin, youtube: Youtube, github: Github };
const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };

export function SocialMediaLinks({ links, size = 'md', className }: SocialMediaLinksProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      {links.map(link => {
        const Icon = icons[link.platform.toLowerCase()];
        if (!Icon) return null;
        return (
          <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
            <Icon className={sizes[size]} />
          </a>
        );
      })}
    </div>
  );
}

export default SocialMediaLinks;
