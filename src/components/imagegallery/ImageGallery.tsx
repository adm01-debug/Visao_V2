import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageGalleryProps {
  images: { src: string; alt?: string }[];
  className?: string;
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);

  return (
    <>
      <div className={cn('grid grid-cols-4 gap-2', className)}>
        {images.map((img, i) => (
          <img key={i} src={img.src} alt={img.alt || ''} onClick={() => { setCurrent(i); setLightbox(true); }}
            className="aspect-square object-cover rounded cursor-pointer hover:opacity-90" />
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 text-white"><X /></button>
          <button onClick={prev} className="absolute left-4 text-white"><ChevronLeft className="h-8 w-8" /></button>
          <img src={images[current].src} alt={images[current].alt || ''} className="max-h-[90vh] max-w-[90vw]" />
          <button onClick={next} className="absolute right-4 text-white"><ChevronRight className="h-8 w-8" /></button>
        </div>
      )}
    </>
  );
}

export default ImageGallery;
