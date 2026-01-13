import React from 'react';
import { cn } from '@/lib/utils';
import { Image, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface LightboxProps { images: string[]; initialIndex?: number; open: boolean; onClose: () => void; className?: string; }

export function Lightbox({ images, initialIndex = 0, open, onClose, className }: LightboxProps) {
  const [index, setIndex] = React.useState(initialIndex);
  const [zoom, setZoom] = React.useState(1);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2">
        <button className="p-2 bg-white/10 rounded hover:bg-white/20" onClick={e => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.5)); }}><ZoomIn className="h-5 w-5 text-white" /></button>
        <button className="p-2 bg-white/10 rounded hover:bg-white/20" onClick={e => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.5)); }}><ZoomOut className="h-5 w-5 text-white" /></button>
        <button className="p-2 bg-white/10 rounded hover:bg-white/20" onClick={onClose}><X className="h-5 w-5 text-white" /></button>
      </div>
      <img src={images[index]} className="max-w-[90vw] max-h-[90vh] object-contain transition-transform" style={{ transform: `scale(${zoom})` }} onClick={e => e.stopPropagation()} />
      {images.length > 1 && (
        <div className="absolute bottom-4 flex gap-2">
          {images.map((_, i) => <button key={i} onClick={e => { e.stopPropagation(); setIndex(i); }} className={cn('w-2 h-2 rounded-full', i === index ? 'bg-white' : 'bg-white/50')} />)}
        </div>
      )}
    </div>
  );
}

export default Lightbox;
