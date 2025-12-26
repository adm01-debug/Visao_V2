/**
 * Image Gallery Component
 * Grid gallery with lightbox
 */

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2 } from 'lucide-react';

export interface GalleryImage {
  id: string;
  src: string;
  thumbnail?: string;
  alt?: string;
  title?: string;
  description?: string;
}

export interface ImageGalleryProps {
  images: GalleryImage[];
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: number;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  showCaptions?: boolean;
  enableLightbox?: boolean;
  enableZoom?: boolean;
  enableDownload?: boolean;
  onImageClick?: (image: GalleryImage, index: number) => void;
  className?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  columns = 3,
  gap = 4,
  aspectRatio = 'square',
  showCaptions = false,
  enableLightbox = true,
  enableZoom = true,
  enableDownload = true,
  onImageClick,
  className,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const currentImage = images[currentIndex];

  const openLightbox = useCallback((index: number) => {
    if (!enableLightbox) {
      onImageClick?.(images[index], index);
      return;
    }
    setCurrentIndex(index);
    setLightboxOpen(true);
    setZoom(1);
  }, [enableLightbox, images, onImageClick]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoom(1);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    setZoom(1);
  }, [images.length]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImage.src;
    link.download = currentImage.title || 'image';
    link.click();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': closeLightbox(); break;
        case 'ArrowLeft': goToPrev(); break;
        case 'ArrowRight': goToNext(); break;
        case '+': case '=': handleZoomIn(); break;
        case '-': handleZoomOut(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, goToPrev, goToNext]);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: '',
  };

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  };

  return (
    <>
      {/* Grid */}
      <div className={cn('image-gallery grid', columnClasses[columns], className)} style={{ gap: `${gap * 4}px` }}>
        {images.map((image, index) => (
          <div
            key={image.id}
            onClick={() => openLightbox(index)}
            className="group relative overflow-hidden rounded-lg cursor-pointer bg-muted"
          >
            <img
              src={image.thumbnail || image.src}
              alt={image.alt || image.title || ''}
              className={cn(
                'w-full h-full object-cover transition-transform group-hover:scale-105',
                aspectClasses[aspectRatio]
              )}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {showCaptions && image.title && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm font-medium truncate">{image.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={closeLightbox}>
          {/* Header */}
          <div className="flex items-center justify-between p-4" onClick={e => e.stopPropagation()}>
            <div className="text-white">
              <span className="text-sm">{currentIndex + 1} / {images.length}</span>
              {currentImage.title && <span className="ml-4">{currentImage.title}</span>}
            </div>
            <div className="flex items-center gap-2">
              {enableZoom && (
                <>
                  <button onClick={handleZoomOut} className="p-2 text-white/70 hover:text-white">
                    <ZoomOut className="h-5 w-5" />
                  </button>
                  <span className="text-white/70 text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={handleZoomIn} className="p-2 text-white/70 hover:text-white">
                    <ZoomIn className="h-5 w-5" />
                  </button>
                </>
              )}
              {enableDownload && (
                <button onClick={handleDownload} className="p-2 text-white/70 hover:text-white">
                  <Download className="h-5 w-5" />
                </button>
              )}
              <button onClick={closeLightbox} className="p-2 text-white/70 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
            <img
              src={currentImage.src}
              alt={currentImage.alt || ''}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          </div>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex justify-center gap-2 p-4 overflow-x-auto" onClick={e => e.stopPropagation()}>
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => { setCurrentIndex(index); setZoom(1); }}
                  className={cn(
                    'w-16 h-16 flex-shrink-0 rounded overflow-hidden border-2 transition-all',
                    index === currentIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-100'
                  )}
                >
                  <img src={image.thumbnail || image.src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ImageGallery;
