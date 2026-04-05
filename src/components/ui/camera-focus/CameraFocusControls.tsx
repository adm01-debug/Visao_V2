import React from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, VolumeX, Volume2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  active?: boolean;
}

export function ControlButton({ icon, onClick, disabled, label, active }: ControlButtonProps) {
  return (
    <motion.button
      className={cn(
        'p-2 rounded-full transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white hover:bg-white/20',
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

interface BottomControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  zoom: number;
  showControls: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function BottomControls({
  isPlaying, isMuted, zoom, showControls,
  onTogglePlay, onToggleMute, onZoomIn, onZoomOut, onResetZoom,
}: BottomControlsProps) {
  return (
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
        <ControlButton icon={isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />} onClick={onTogglePlay} label={isPlaying ? 'Pausar' : 'Reproduzir'} />
        <ControlButton icon={isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />} onClick={onToggleMute} label={isMuted ? 'Ativar som' : 'Mudo'} />
        <div className="w-px h-6 bg-white/30" />
        <ControlButton icon={<ZoomOut className="w-5 h-5" />} onClick={onZoomOut} disabled={zoom <= 1} label="Diminuir zoom" />
        <span className="text-white text-sm min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
        <ControlButton icon={<ZoomIn className="w-5 h-5" />} onClick={onZoomIn} disabled={zoom >= 3} label="Aumentar zoom" />
        <ControlButton icon={<RotateCcw className="w-4 h-4" />} onClick={onResetZoom} disabled={zoom === 1} label="Resetar zoom" />
      </div>
      <p className="text-center text-white/40 text-xs mt-3">← → Navegar • Espaço Play/Pause • M Mudo • +/- Zoom • Esc Fechar</p>
    </motion.div>
  );
}
