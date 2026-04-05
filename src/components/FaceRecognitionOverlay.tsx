/**
 * VISÃO - FaceRecognitionOverlay (Refactored)
 * Types extracted to ./face-recognition/faceRecognitionTypes.ts
 */
import { useState, useEffect, useMemo } from 'react';
import { User, UserCheck, Star, AlertTriangle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DetectedFace, ListType, FaceRecognitionOverlayProps,
  listTypeStyles, FACE_PRIORITY,
} from './face-recognition/faceRecognitionTypes';

// Re-export types
export type { ListType, DetectedFace, FaceRecognitionOverlayProps };

function FaceBox({ face, showLabel, showSimilarity, showDetails, animate, onClick }: {
  face: DetectedFace; showLabel: boolean; showSimilarity: boolean; showDetails: boolean; animate: boolean; onClick?: () => void;
}) {
  const style = listTypeStyles[face.listType];
  const Icon = style.icon;
  const isAlert = face.listType === 'blacklist' || face.listType === 'unknown';

  return (
    <div className={cn('absolute pointer-events-auto cursor-pointer transition-all duration-300', animate && 'animate-pulse')}
      style={{ left: `${face.boundingBox.x}%`, top: `${face.boundingBox.y}%`, width: `${face.boundingBox.width}%`, height: `${face.boundingBox.height}%` }}
      onClick={onClick}>
      <div className={cn('absolute inset-0 border-2 rounded transition-all', style.borderColor, isAlert && animate && 'animate-pulse shadow-lg', isAlert && 'border-3')}
        style={{ boxShadow: isAlert ? `0 0 20px ${face.listType === 'blacklist' ? '#ef4444' : '#9ca3af'}` : undefined }}>
        <div className={cn('absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 rounded-tl', style.borderColor)} />
        <div className={cn('absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 rounded-tr', style.borderColor)} />
        <div className={cn('absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 rounded-bl', style.borderColor)} />
        <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 rounded-br', style.borderColor)} />
      </div>
      {showLabel && (
        <div className={cn('absolute left-0 right-0 flex items-center justify-center gap-1 px-2 py-1 rounded text-foreground text-xs font-medium whitespace-nowrap transform -translate-y-full -top-1', style.bgColor)}>
          <Icon className="w-3 h-3" />
          <span className="truncate max-w-[120px]">{face.isKnown ? face.personName : style.label}</span>
          {showSimilarity && face.similarity && <span className="opacity-75">{Math.round(face.similarity * 100)}%</span>}
        </div>
      )}
      {showDetails && (
        <div className="absolute left-0 right-0 top-full mt-1 px-2 py-1.5 rounded bg-foreground/80 text-background text-[10px] space-y-0.5">
          {face.emotions && <div className="flex justify-between"><span className="opacity-70">Emoção:</span><span>{face.emotions.dominant}</span></div>}
          {face.age && <div className="flex justify-between"><span className="opacity-70">Idade:</span><span>{face.age.min}-{face.age.max}</span></div>}
          {face.gender && <div className="flex justify-between"><span className="opacity-70">Gênero:</span><span>{face.gender.value}</span></div>}
        </div>
      )}
    </div>
  );
}

function StatsPanel({ faces }: { faces: DetectedFace[] }) {
  const stats = useMemo(() => {
    const known = faces.filter(f => f.isKnown).length;
    const blacklisted = faces.filter(f => f.listType === 'blacklist').length;
    const vip = faces.filter(f => f.listType === 'vip').length;
    return { known, blacklisted, vip, total: faces.length };
  }, [faces]);
  if (stats.total === 0) return null;
  return (
    <div className="absolute top-2 right-2 flex flex-col gap-1 text-[10px]">
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-foreground/70 text-background"><User className="w-3 h-3" /><span>{stats.total} detectado{stats.total !== 1 ? 's' : ''}</span></div>
      {stats.known > 0 && <div className="flex items-center gap-1 px-2 py-1 rounded bg-success/80 text-foreground"><UserCheck className="w-3 h-3" /><span>{stats.known} conhecido{stats.known !== 1 ? 's' : ''}</span></div>}
      {stats.blacklisted > 0 && <div className="flex items-center gap-1 px-2 py-1 rounded bg-destructive/80 text-foreground animate-pulse"><Ban className="w-3 h-3" /><span>{stats.blacklisted} bloqueado{stats.blacklisted !== 1 ? 's' : ''}</span></div>}
      {stats.vip > 0 && <div className="flex items-center gap-1 px-2 py-1 rounded bg-warning/80 text-foreground"><Star className="w-3 h-3" /><span>{stats.vip} VIP</span></div>}
    </div>
  );
}

export function FaceRecognitionOverlay({ faces, showLabels = true, showSimilarity = true, showDetails = false, animateBoxes = true, className, onFaceClick }: FaceRecognitionOverlayProps) {
  const activeFaces = useMemo(() => { const now = Date.now(); return faces.filter(f => now - new Date(f.timestamp).getTime() < 5000); }, [faces]);
  const sortedFaces = useMemo(() => [...activeFaces].sort((a, b) => (FACE_PRIORITY[a.listType] || 99) - (FACE_PRIORITY[b.listType] || 99)), [activeFaces]);
  if (sortedFaces.length === 0) return null;
  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" />
      {sortedFaces.map(face => (
        <FaceBox key={face.id} face={face} showLabel={showLabels} showSimilarity={showSimilarity} showDetails={showDetails}
          animate={animateBoxes && (face.listType === 'blacklist' || face.listType === 'unknown')} onClick={() => onFaceClick?.(face)} />
      ))}
      <StatsPanel faces={sortedFaces} />
      {sortedFaces.some(f => f.listType === 'blacklist') && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/70 opacity-75" />
          <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-foreground font-medium">
            <AlertTriangle className="w-5 h-5" />PESSOA BLOQUEADA DETECTADA
          </div>
        </div>
      )}
    </div>
  );
}

export function useFaceDetectionAnimation(faces: DetectedFace[], intervalMs = 100) {
  const [visibleFaces, setVisibleFaces] = useState<DetectedFace[]>([]);
  useEffect(() => {
    const newFaces = faces.filter(f => !visibleFaces.some(vf => vf.id === f.id));
    if (newFaces.length > 0) { newFaces.forEach((face, index) => { setTimeout(() => { setVisibleFaces(prev => [...prev, face]); }, index * intervalMs); }); }
    const currentIds = new Set(faces.map(f => f.id));
    setVisibleFaces(prev => prev.filter(f => currentIds.has(f.id)));
  }, [faces, intervalMs]);
  return visibleFaces;
}

export default FaceRecognitionOverlay;
