/**
 * CameraFocusMode (Refactored)
 * Controls extracted to ./camera-focus/CameraFocusControls.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Settings, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PulseIndicator } from './MotionComponents';
import { ControlButton, BottomControls } from './camera-focus/CameraFocusControls';

interface CameraFocusProps {
  cameraId: string; cameraName: string; streamUrl?: string; thumbnail?: string;
  isOpen: boolean; onClose: () => void; onPrevious?: () => void; onNext?: () => void;
  hasPrevious?: boolean; hasNext?: boolean; onSettingsClick?: () => void;
}

export function CameraFocusMode({ _cameraId, cameraName, _streamUrl, thumbnail, isOpen, onClose, onPrevious, onNext, hasPrevious = false, hasNext = false, onSettingsClick }: CameraFocusProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => { if (!showControls) return; const t = setTimeout(() => setShowControls(false), 3000); return () => clearTimeout(t); }, [showControls]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': if (hasPrevious) onPrevious?.(); break;
        case 'ArrowRight': if (hasNext) onNext?.(); break;
        case ' ': e.preventDefault(); setIsPlaying(p => !p); break;
        case 'm': setIsMuted(m => !m); break;
        case '+': case '=': setZoom(z => Math.min(z + 0.25, 3)); break;
        case '-': setZoom(z => Math.max(z - 0.25, 1)); break;
        case '0': setZoom(1); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, onClose, onPrevious, onNext]);

  useEffect(() => { if (isOpen) document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 bg-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseMove={() => setShowControls(true)} onClick={() => setShowControls(true)}>
          {hasPrevious && <motion.button className={cn('absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-foreground/50 text-background hover:bg-foreground/70 transition-colors', !showControls && 'opacity-0')} onClick={onPrevious} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><ChevronLeft className="w-8 h-8" /></motion.button>}
          {hasNext && <motion.button className={cn('absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-foreground/50 text-background hover:bg-foreground/70 transition-colors', !showControls && 'opacity-0')} onClick={onNext} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><ChevronRight className="w-8 h-8" /></motion.button>}

          <motion.div className={cn('absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent', !showControls && 'opacity-0')} initial={{ y: -50 }} animate={{ y: showControls ? 0 : -50 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-3">
              <PulseIndicator color="success" size="sm" />
              <div><h2 className="text-foreground font-semibold">{cameraName}</h2><p className="text-foreground/60 text-sm">Transmissão ao vivo</p></div>
            </div>
            <div className="flex items-center gap-2">
              <ControlButton icon={<Settings className="w-5 h-5" />} onClick={onSettingsClick ?? (() => {})} label="Configurações" disabled={!onSettingsClick} />
              <ControlButton icon={<Grid3X3 className="w-5 h-5" />} onClick={onClose} label="Voltar ao grid" />
              <ControlButton icon={<X className="w-5 h-5" />} onClick={onClose} label="Fechar" />
            </div>
          </motion.div>

          <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ scale: zoom }}>
            {thumbnail ? <img src={thumbnail} alt={cameraName} className="max-w-full max-h-full object-contain" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><Camera className="w-24 h-24 text-muted-foreground/30" /></div>}
          </motion.div>

          <BottomControls isPlaying={isPlaying} isMuted={isMuted} zoom={zoom} showControls={showControls}
            onTogglePlay={() => setIsPlaying(p => !p)} onToggleMute={() => setIsMuted(m => !m)}
            onZoomIn={useCallback(() => setZoom(z => Math.min(z + 0.25, 3)), [])}
            onZoomOut={useCallback(() => setZoom(z => Math.max(z - 0.25, 1)), [])}
            onResetZoom={useCallback(() => setZoom(1), [])} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// CameraGridLayout
type GridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '1+5' | '1+7';
interface CameraGridLayoutProps { cameras: Array<{ id: string; name: string; thumbnail?: string; status: 'online' | 'offline' }>; layout?: GridLayout; onCameraClick: (cameraId: string) => void; className?: string; }

export function CameraGridLayout({ cameras, layout = '2x2', onCameraClick, className }: CameraGridLayoutProps) {
  const layoutClasses: Record<GridLayout, string> = { '1x1': 'grid-cols-1', '2x2': 'grid-cols-1 md:grid-cols-2', '3x3': 'grid-cols-2 md:grid-cols-3', '4x4': 'grid-cols-2 md:grid-cols-4', '1+5': 'grid-cols-2 md:grid-cols-3', '1+7': 'grid-cols-2 md:grid-cols-4' };
  return (
    <div className={cn('grid gap-2', layoutClasses[layout], className)}>
      {cameras.map((camera, index) => (
        <motion.div key={camera.id} className={cn('relative aspect-video rounded-lg overflow-hidden cursor-pointer bg-muted border border-border hover:border-primary/50 transition-colors', layout === '1+5' && index === 0 && 'md:col-span-2 md:row-span-2', layout === '1+7' && index === 0 && 'md:col-span-2 md:row-span-2')}
          onClick={() => onCameraClick(camera.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
          {camera.thumbnail ? <img src={camera.thumbnail} alt={camera.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Camera className="w-8 h-8 text-muted-foreground/30" /></div>}
          <div className="absolute top-2 left-2"><PulseIndicator color={camera.status === 'online' ? 'success' : 'destructive'} size="sm" /></div>
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent"><p className="text-foreground text-sm font-medium truncate">{camera.name}</p></div>
        </motion.div>
      ))}
    </div>
  );
}
