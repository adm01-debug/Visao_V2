import React from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, Github, Globe, Twitter, Linkedin } from 'lucide-react';

interface ProfileHeaderProps { name: string; bio?: string; avatar?: string; coverImage?: string; links?: { type: string; url: string }[]; className?: string; }

const linkIcons: Record<string, typeof ExternalLink> = { github: Github, website: Globe, twitter: Twitter, linkedin: Linkedin };

export function ProfileHeader({ name, bio, avatar, coverImage, links = [], className }: ProfileHeaderProps) {
  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10" style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover' } : {}} />
      <div className="px-6 pb-6">
        <div className="flex items-end gap-4 -mt-12">
          <div className="w-24 h-24 rounded-full border-4 border-background bg-muted flex items-center justify-center text-2xl font-bold overflow-hidden">
            {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : name[0]}
          </div>
          <div className="flex-1 pt-12"><h2 className="text-xl font-bold">{name}</h2>{bio && <p className="text-muted-foreground">{bio}</p>}</div>
        </div>
        {links.length > 0 && (
          <div className="flex gap-2 mt-4">{links.map((l, i) => { const Icon = linkIcons[l.type] || ExternalLink; return <a key={i} href={l.url} className="p-2 rounded-lg hover:bg-accent"><Icon className="h-4 w-4" /></a>; })}</div>
        )}
      </div>
    </div>
  );
}

export default ProfileHeader;
