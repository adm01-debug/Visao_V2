import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX,
  Camera,
  Settings,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PulseIndicator } from './MotionComponents';

interface CameraFocusProps {
  cameraId: string;
  cameraName: string;
  streamUrl?: string;
  thumbnail?: string;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function CameraFocusMode({
  cameraId,
  cameraName,
  streamUrl,
  thumbnail,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: CameraFocusProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious) onPrevious?.();
          break;
        case 'ArrowRight':
          if (hasNext) onNext?.();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 'm':
          setIsMuted(m => !m);
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(z + 0.25, 3));
          break;
        case '-':
          setZoom(z => Math.max(z - 0.25, 1));
          break;
        case '0':
          setZoom(1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, onClose, onPrevious, onNext]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 1)), []);
  const handleResetZoom = useCallback(() => setZoom(1), []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseMove={() => setShowControls(true)}
          onClick={() => setShowControls(true)}
        >
          {/* Navigation Arrows */}
          {hasPrevious && (
            <motion.button
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 z-20',
                'p-3 rounded-full bg-black/50 text-white',
                'hover:bg-black/70 transition-colors',
                !showControls && 'opacity-0'
              )}
              onClick={onPrevious}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-8 h-8" />
            </motion.button>
          )}

          {hasNext && (
            <motion.button
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 z-20',
                'p-3 rounded-full bg-black/50 text-white',
                'hover:bg-black/70 transition-colors',
                !showControls && 'opacity-0'
              )}
              onClick={onNext}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-8 h-8" />
            </motion.button>
          )}

          {/* Top Bar */}
          <motion.div
            className={cn(
              'absolute top-0 left-0 right-0 z-20',
              'flex items-center justify-between p-4',
              'bg-gradient-to-b from-black/80 to-transparent',
              !showControls && 'opacity-0'
            )}
            initial={{ y: -50 }}
            animate={{ y: showControls ? 0 : -50 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <PulseIndicator color="success" size="sm" />
              <div>
                <h2 className="text-white font-semibold">{cameraName}</h2>
                <p className="text-white/60 text-sm">Transmissão ao vivo</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ControlButton
                icon={<Settings className="w-5 h-5" />}
                onClick={() => {}}
                label="Configurações"
              />
              <ControlButton
                icon={<Grid3X3 className="w-5 h-5" />}
                onClick={onClose}
                label="Voltar ao grid"
              />
              <ControlButton
                icon={<X className="w-5 h-5" />}
                onClick={onClose}
                label="Fechar"
              />
            </div>
          </motion.div>

          {/* Video Container */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ scale: zoom }}
          >
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={cameraName}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Camera className="w-24 h-24 text-muted-foreground/30" />
              </div>
            )}
          </motion.div>

          {/* Bottom Controls */}
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 z-20',
              'p-4 bg-gradient-to-t from-black/80 to-transparent',
              !showControls && 'opacity-0'
            )}
            initial={{ y: 50 }}
            animate={{ y: showControls ? 0 : 50 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-center gap-4">
              {/* Playback Controls */}
              <ControlButton
                icon={isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                onClick={() => setIsPlaying(p => !p)}
                label={isPlaying ? 'Pausar' : 'Reproduzir'}
              />

              {/* Volume */}
              <ControlButton
                icon={isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                onClick={() => setIsMuted(m => !m)}
                label={isMuted ? 'Ativar som' : 'Mudo'}
              />

              <div className="w-px h-6 bg-white/30" />

              {/* Zoom Controls */}
              <ControlButton
                icon={<ZoomOut className="w-5 h-5" />}
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                label="Diminuir zoom"
              />
              
              <span className="text-white text-sm min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              
              <ControlButton
                icon={<ZoomIn className="w-5 h-5" />}
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                label="Aumentar zoom"
              />
              
              <ControlButton
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={handleResetZoom}
                disabled={zoom === 1}
                label="Resetar zoom"
              />
            </div>

            {/* Keyboard Shortcuts Hint */}
            <p className="text-center text-white/40 text-xs mt-3">
              ← → Navegar • Espaço Play/Pause • M Mudo • +/- Zoom • Esc Fechar
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// CONTROL BUTTON
// ============================================

interface ControlButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  active?: boolean;
}

function ControlButton({ icon, onClick, disabled, label, active }: ControlButtonProps) {
  return (
    <motion.button
      className={cn(
        'p-2 rounded-full transition-colors',
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-white/10 text-white hover:bg-white/20',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      title={label}
      aria-label={label}
    >
      {icon}
    </motion.button>
  );
}

// ============================================
// CAMERA GRID LAYOUT
// ============================================

type GridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '1+5' | '1+7';

interface CameraGridLayoutProps {
  cameras: Array<{
    id: string;
    name: string;
    thumbnail?: string;
    status: 'online' | 'offline';
  }>;
  layout?: GridLayout;
  onCameraClick: (cameraId: string) => void;
  className?: string;
}

export function CameraGridLayout({
  cameras,
  layout = '2x2',
  onCameraClick,
  className,
}: CameraGridLayoutProps) {
  const layoutClasses: Record<GridLayout, string> = {
    '1x1': 'grid-cols-1',
    '2x2': 'grid-cols-1 md:grid-cols-2',
    '3x3': 'grid-cols-2 md:grid-cols-3',
    '4x4': 'grid-cols-2 md:grid-cols-4',
    '1+5': 'grid-cols-2 md:grid-cols-3',
    '1+7': 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-2', layoutClasses[layout], className)}>
      {cameras.map((camera, index) => (
        <motion.div
          key={camera.id}
          className={cn(
            'relative aspect-video rounded-lg overflow-hidden cursor-pointer',
            'bg-muted border border-border',
            'hover:border-primary/50 transition-colors',
            // Special layouts
            layout === '1+5' && index === 0 && 'md:col-span-2 md:row-span-2',
            layout === '1+7' && index === 0 && 'md:col-span-2 md:row-span-2'
          )}
          onClick={() => onCameraClick(camera.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          {camera.thumbnail ? (
            <img 
              src={camera.thumbnail} 
              alt={camera.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}

          {/* Status indicator */}
          <div className="absolute top-2 left-2">
            <PulseIndicator 
              color={camera.status === 'online' ? 'success' : 'destructive'} 
              size="sm" 
            />
          </div>

          {/* Camera name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-sm font-medium truncate">
              {camera.name}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
