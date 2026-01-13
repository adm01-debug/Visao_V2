import React from 'react';
import { cn } from '@/lib/utils';
import { Play, Clock, Eye } from 'lucide-react';

interface VideoThumbnailProps { title: string; thumbnail: string; duration: string; views?: number; channel?: string; onClick?: () => void; className?: string; }

export function VideoThumbnail({ title, thumbnail, duration, views, channel, onClick, className }: VideoThumbnailProps) {
  return (
    <div className={cn('group cursor-pointer', className)} onClick={onClick}>
      <div className="relative rounded-lg overflow-hidden mb-2">
        <img src={thumbnail} alt="" className="w-full aspect-video object-cover group-hover:scale-105 transition-transform" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="h-12 w-12 text-white" />
        </div>
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">{duration}</span>
      </div>
      <h3 className="font-medium line-clamp-2 mb-1">{title}</h3>
      {channel && <p className="text-sm text-muted-foreground">{channel}</p>}
      {views && <p className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />{views.toLocaleString()} visualizações</p>}
    </div>
  );
}

export default VideoThumbnail;
