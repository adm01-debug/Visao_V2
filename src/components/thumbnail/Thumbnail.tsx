import React from 'react';
import { cn } from '@/lib/utils';
import { Play, Image } from 'lucide-react';

interface ThumbnailProps {
  src?: string;
  alt?: string;
  type?: 'image' | 'video';
  aspectRatio?: '1:1' | '4:3' | '16:9';
  onClick?: () => void;
  className?: string;
}

const ratioClasses = { '1:1': 'aspect-square', '4:3': 'aspect-[4/3]', '16:9': 'aspect-video' };

export function Thumbnail({ src, alt = '', type = 'image', aspectRatio = '16:9', onClick, className }: ThumbnailProps) {
  return (
    <div onClick={onClick} className={cn('relative bg-muted rounded-lg overflow-hidden', ratioClasses[aspectRatio], onClick && 'cursor-pointer group', className)}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><Image className="h-8 w-8 text-muted-foreground" /></div>
      )}
      {type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
          <Play className="h-10 w-10 text-white fill-white" />
        </div>
      )}
    </div>
  );
}

export default Thumbnail;
