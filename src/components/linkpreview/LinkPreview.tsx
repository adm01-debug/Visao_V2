import React from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  className?: string;
}

export function LinkPreview({ url, title, description, image, className }: LinkPreviewProps) {
  const hostname = new URL(url).hostname;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={cn('block border rounded-lg overflow-hidden hover:shadow-md transition-shadow', className)}>
      {image && <img src={image} alt="" className="w-full h-32 object-cover" />}
      <div className="p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <ExternalLink className="h-3 w-3" />
          <span>{hostname}</span>
        </div>
        {title && <h4 className="font-medium line-clamp-1">{title}</h4>}
        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}
      </div>
    </a>
  );
}

export default LinkPreview;
