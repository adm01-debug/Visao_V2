import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, RotateCw, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageZoomProps {
  src: string;
  alt?: string;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

export function ImageZoom({ src, alt = '', minZoom = 1, maxZoom = 5, className }: ImageZoomProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setZoom(z => Math.min(maxZoom, z + 0.5));
  const zoomOut = () => setZoom(z => Math.max(minZoom, z - 0.5));
  const rotate = () => setRotation(r => (r + 90) % 360);
  const reset = () => { setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); };

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-black', className)}>
      <div ref={containerRef} className="w-full h-full overflow-hidden cursor-move"
        onMouseDown={e => {
          const startX = e.clientX - position.x;
          const startY = e.clientY - position.y;
          const move = (ev: MouseEvent) => setPosition({ x: ev.clientX - startX, y: ev.clientY - startY });
          const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
          document.addEventListener('mousemove', move);
          document.addEventListener('mouseup', up);
        }}>
        <img src={src} alt={alt} className="w-full h-full object-contain transition-transform"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x/zoom}px, ${position.y/zoom}px)` }} draggable={false} />
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-black/60 rounded-lg">
        <Button variant="ghost" size="sm" onClick={zoomOut} disabled={zoom <= minZoom}><ZoomOut className="h-4 w-4 text-white" /></Button>
        <span className="flex items-center text-white text-xs px-2">{Math.round(zoom*100)}%</span>
        <Button variant="ghost" size="sm" onClick={zoomIn} disabled={zoom >= maxZoom}><ZoomIn className="h-4 w-4 text-white" /></Button>
        <Button variant="ghost" size="sm" onClick={rotate}><RotateCw className="h-4 w-4 text-white" /></Button>
        <Button variant="ghost" size="sm" onClick={reset}><Maximize className="h-4 w-4 text-white" /></Button>
      </div>
    </div>
  );
}

export default ImageZoom;
