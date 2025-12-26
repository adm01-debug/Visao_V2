/**
 * Image Cropper Component
 * Interactive image cropping with aspect ratio support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, Check, X } from 'lucide-react';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropperProps {
  src: string;
  aspectRatio?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  circular?: boolean;
  showGrid?: boolean;
  showZoomControls?: boolean;
  showRotateControls?: boolean;
  onCropComplete?: (croppedImage: Blob, cropArea: CropArea) => void;
  onCancel?: () => void;
  className?: string;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  src,
  aspectRatio,
  minWidth = 50,
  minHeight = 50,
  maxWidth,
  maxHeight,
  circular = false,
  showGrid = true,
  showZoomControls = true,
  showRotateControls = true,
  onCropComplete,
  onCancel,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);

      // Initialize crop area
      const size = Math.min(img.width, img.height) * 0.8;
      const width = aspectRatio ? size : size;
      const height = aspectRatio ? size / aspectRatio : size;
      setCrop({
        x: (img.width - width) / 2,
        y: (img.height - height) / 2,
        width,
        height,
      });
    };
    img.src = src;
  }, [src, aspectRatio]);

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, action: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (action === 'move') {
      setIsDragging(true);
    } else {
      setIsResizing(action);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const deltaX = (e.clientX - dragStart.x) / zoom;
    const deltaY = (e.clientY - dragStart.y) / zoom;
    setDragStart({ x: e.clientX, y: e.clientY });

    setCrop(prev => {
      let newCrop = { ...prev };

      if (isDragging) {
        newCrop.x = Math.max(0, Math.min(imageDimensions.width - prev.width, prev.x + deltaX));
        newCrop.y = Math.max(0, Math.min(imageDimensions.height - prev.height, prev.y + deltaY));
      } else if (isResizing) {
        switch (isResizing) {
          case 'nw':
            newCrop.x = prev.x + deltaX;
            newCrop.y = prev.y + deltaY;
            newCrop.width = prev.width - deltaX;
            newCrop.height = aspectRatio ? newCrop.width / aspectRatio : prev.height - deltaY;
            break;
          case 'ne':
            newCrop.y = prev.y + deltaY;
            newCrop.width = prev.width + deltaX;
            newCrop.height = aspectRatio ? newCrop.width / aspectRatio : prev.height - deltaY;
            break;
          case 'sw':
            newCrop.x = prev.x + deltaX;
            newCrop.width = prev.width - deltaX;
            newCrop.height = aspectRatio ? newCrop.width / aspectRatio : prev.height + deltaY;
            break;
          case 'se':
            newCrop.width = prev.width + deltaX;
            newCrop.height = aspectRatio ? newCrop.width / aspectRatio : prev.height + deltaY;
            break;
        }

        // Apply constraints
        newCrop.width = Math.max(minWidth, Math.min(maxWidth || imageDimensions.width, newCrop.width));
        newCrop.height = Math.max(minHeight, Math.min(maxHeight || imageDimensions.height, newCrop.height));
        newCrop.x = Math.max(0, Math.min(imageDimensions.width - newCrop.width, newCrop.x));
        newCrop.y = Math.max(0, Math.min(imageDimensions.height - newCrop.height, newCrop.y));
      }

      return newCrop;
    });
  }, [isDragging, isResizing, dragStart, zoom, imageDimensions, aspectRatio, minWidth, minHeight, maxWidth, maxHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev + 0.1));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.1));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleFlipH = () => setFlipH(prev => !prev);
  const handleFlipV = () => setFlipV(prev => !prev);

  // Crop and export
  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = crop.width;
    canvas.height = crop.height;

    // Apply transformations
    ctx.save();
    if (circular) {
      ctx.beginPath();
      ctx.arc(crop.width / 2, crop.height / 2, Math.min(crop.width, crop.height) / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.translate(crop.width / 2, crop.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.translate(-crop.width / 2, -crop.height / 2);

    ctx.drawImage(
      imageRef.current,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, crop.width, crop.height
    );
    ctx.restore();

    canvas.toBlob(blob => {
      if (blob) {
        onCropComplete?.(blob, crop);
      }
    }, 'image/png');
  }, [crop, rotation, flipH, flipV, circular, onCropComplete]);

  return (
    <div className={cn('image-cropper flex flex-col gap-4', className)}>
      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-black/50 rounded-lg"
        style={{ maxHeight: 500 }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {imageLoaded && (
          <>
            {/* Image */}
            <img
              ref={imageRef}
              src={src}
              alt="Crop preview"
              className="max-w-full h-auto"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                transformOrigin: 'center',
              }}
              draggable={false}
            />

            {/* Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50" />
              
              {/* Crop area (clear) */}
              <div
                className={cn(
                  'absolute bg-transparent border-2 border-white shadow-lg cursor-move pointer-events-auto',
                  circular && 'rounded-full'
                )}
                style={{
                  left: crop.x * zoom,
                  top: crop.y * zoom,
                  width: crop.width * zoom,
                  height: crop.height * zoom,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Grid */}
                {showGrid && !circular && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                  </div>
                )}

                {/* Resize handles */}
                {['nw', 'ne', 'sw', 'se'].map(handle => (
                  <div
                    key={handle}
                    className={cn(
                      'absolute w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer',
                      handle.includes('n') ? '-top-2' : '-bottom-2',
                      handle.includes('w') ? '-left-2' : '-right-2'
                    )}
                    onMouseDown={(e) => handleMouseDown(e, handle)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showZoomControls && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 rounded hover:bg-accent transition-colors"
                title="Diminuir zoom"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-2 rounded hover:bg-accent transition-colors"
                title="Aumentar zoom"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </>
          )}

          {showRotateControls && (
            <>
              <div className="w-px h-6 bg-border mx-2" />
              <button
                onClick={handleRotate}
                className="p-2 rounded hover:bg-accent transition-colors"
                title="Rotacionar"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleFlipH}
                className={cn('p-2 rounded transition-colors', flipH ? 'bg-accent' : 'hover:bg-accent')}
                title="Espelhar horizontal"
              >
                <FlipHorizontal className="h-5 w-5" />
              </button>
              <button
                onClick={handleFlipV}
                className={cn('p-2 rounded transition-colors', flipV ? 'bg-accent' : 'hover:bg-accent')}
                title="Espelhar vertical"
              >
                <FlipVertical className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded border hover:bg-accent transition-colors flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Recortar
          </button>
        </div>
      </div>

      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ImageCropper;
