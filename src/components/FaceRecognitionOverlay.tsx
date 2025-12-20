/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: FaceRecognitionOverlay
 * 
 * Overlay para exibir detecções faciais sobre o vídeo:
 * - Bounding boxes em rostos detectados
 * - Nome/identificação da pessoa
 * - Score de similaridade
 * - Indicador de lista (whitelist, blacklist, etc)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  User,
  UserCheck,
  UserX,
  Star,
  AlertTriangle,
  Shield,
  Clock,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

export type ListType = 'whitelist' | 'blacklist' | 'vip' | 'employee' | 'visitor' | 'contractor' | 'unknown';

export interface DetectedFace {
  id: string;
  boundingBox: {
    x: number;      // % da largura (0-100)
    y: number;      // % da altura (0-100)
    width: number;  // % da largura
    height: number; // % da altura
  };
  personId?: string;
  personName?: string;
  listType: ListType;
  similarity?: number;  // 0-1
  isKnown: boolean;
  timestamp: Date;
  emotions?: {
    dominant: string;
    confidence: number;
  };
  age?: {
    min: number;
    max: number;
  };
  gender?: {
    value: string;
    confidence: number;
  };
}

interface FaceRecognitionOverlayProps {
  faces: DetectedFace[];
  showLabels?: boolean;
  showSimilarity?: boolean;
  showDetails?: boolean;
  animateBoxes?: boolean;
  className?: string;
  onFaceClick?: (face: DetectedFace) => void;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const listTypeStyles: Record<ListType, {
  borderColor: string;
  bgColor: string;
  textColor: string;
  icon: any;
  label: string;
}> = {
  whitelist: {
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/90',
    textColor: 'text-green-500',
    icon: UserCheck,
    label: 'Autorizado',
  },
  blacklist: {
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500/90',
    textColor: 'text-red-500',
    icon: Ban,
    label: 'Bloqueado',
  },
  vip: {
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-500/90',
    textColor: 'text-yellow-500',
    icon: Star,
    label: 'VIP',
  },
  employee: {
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/90',
    textColor: 'text-blue-500',
    icon: User,
    label: 'Funcionário',
  },
  visitor: {
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/90',
    textColor: 'text-purple-500',
    icon: User,
    label: 'Visitante',
  },
  contractor: {
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-500/90',
    textColor: 'text-orange-500',
    icon: Shield,
    label: 'Terceiro',
  },
  unknown: {
    borderColor: 'border-gray-400',
    bgColor: 'bg-gray-600/90',
    textColor: 'text-gray-400',
    icon: AlertTriangle,
    label: 'Desconhecido',
  },
};

// ============================================
// COMPONENTE: Face Box
// ============================================

interface FaceBoxProps {
  face: DetectedFace;
  showLabel: boolean;
  showSimilarity: boolean;
  showDetails: boolean;
  animate: boolean;
  onClick?: () => void;
}

function FaceBox({
  face,
  showLabel,
  showSimilarity,
  showDetails,
  animate,
  onClick,
}: FaceBoxProps) {
  const style = listTypeStyles[face.listType];
  const Icon = style.icon;
  const isAlert = face.listType === 'blacklist' || face.listType === 'unknown';

  return (
    <div
      className={cn(
        'absolute pointer-events-auto cursor-pointer transition-all duration-300',
        animate && 'animate-pulse'
      )}
      style={{
        left: `${face.boundingBox.x}%`,
        top: `${face.boundingBox.y}%`,
        width: `${face.boundingBox.width}%`,
        height: `${face.boundingBox.height}%`,
      }}
      onClick={onClick}
    >
      {/* Bounding Box */}
      <div
        className={cn(
          'absolute inset-0 border-2 rounded transition-all',
          style.borderColor,
          isAlert && animate && 'animate-pulse shadow-lg',
          isAlert && 'border-3'
        )}
        style={{
          boxShadow: isAlert ? `0 0 20px ${face.listType === 'blacklist' ? '#ef4444' : '#9ca3af'}` : undefined,
        }}
      >
        {/* Corner indicators */}
        <div className={cn('absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 rounded-tl', style.borderColor)} />
        <div className={cn('absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 rounded-tr', style.borderColor)} />
        <div className={cn('absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 rounded-bl', style.borderColor)} />
        <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 rounded-br', style.borderColor)} />
      </div>

      {/* Label */}
      {showLabel && (
        <div
          className={cn(
            'absolute left-0 right-0 flex items-center justify-center gap-1',
            'px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap',
            'transform -translate-y-full -top-1',
            style.bgColor
          )}
        >
          <Icon className="w-3 h-3" />
          <span className="truncate max-w-[120px]">
            {face.isKnown ? face.personName : style.label}
          </span>
          {showSimilarity && face.similarity && (
            <span className="opacity-75">
              {Math.round(face.similarity * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Details (expandido) */}
      {showDetails && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full mt-1',
            'px-2 py-1.5 rounded bg-black/80 text-white text-[10px]',
            'space-y-0.5'
          )}
        >
          {face.emotions && (
            <div className="flex justify-between">
              <span className="opacity-70">Emoção:</span>
              <span>{face.emotions.dominant}</span>
            </div>
          )}
          {face.age && (
            <div className="flex justify-between">
              <span className="opacity-70">Idade:</span>
              <span>{face.age.min}-{face.age.max}</span>
            </div>
          )}
          {face.gender && (
            <div className="flex justify-between">
              <span className="opacity-70">Gênero:</span>
              <span>{face.gender.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE: Stats Panel
// ============================================

interface StatsPanelProps {
  faces: DetectedFace[];
}

function StatsPanel({ faces }: StatsPanelProps) {
  const stats = useMemo(() => {
    const known = faces.filter(f => f.isKnown).length;
    const unknown = faces.filter(f => !f.isKnown).length;
    const blacklisted = faces.filter(f => f.listType === 'blacklist').length;
    const vip = faces.filter(f => f.listType === 'vip').length;

    return { known, unknown, blacklisted, vip, total: faces.length };
  }, [faces]);

  if (stats.total === 0) return null;

  return (
    <div className="absolute top-2 right-2 flex flex-col gap-1 text-[10px]">
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/70 text-white">
        <User className="w-3 h-3" />
        <span>{stats.total} detectado{stats.total !== 1 ? 's' : ''}</span>
      </div>
      
      {stats.known > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/80 text-white">
          <UserCheck className="w-3 h-3" />
          <span>{stats.known} conhecido{stats.known !== 1 ? 's' : ''}</span>
        </div>
      )}
      
      {stats.blacklisted > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/80 text-white animate-pulse">
          <Ban className="w-3 h-3" />
          <span>{stats.blacklisted} bloqueado{stats.blacklisted !== 1 ? 's' : ''}</span>
        </div>
      )}
      
      {stats.vip > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/80 text-white">
          <Star className="w-3 h-3" />
          <span>{stats.vip} VIP</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function FaceRecognitionOverlay({
  faces,
  showLabels = true,
  showSimilarity = true,
  showDetails = false,
  animateBoxes = true,
  className,
  onFaceClick,
}: FaceRecognitionOverlayProps) {
  // Filtrar rostos recentes (últimos 5 segundos)
  const activeFaces = useMemo(() => {
    const now = Date.now();
    const maxAge = 5000; // 5 segundos
    
    return faces.filter(face => {
      const age = now - new Date(face.timestamp).getTime();
      return age < maxAge;
    });
  }, [faces]);

  // Ordenar por prioridade (blacklist primeiro, depois unknown)
  const sortedFaces = useMemo(() => {
    return [...activeFaces].sort((a, b) => {
      const priority: Record<ListType, number> = {
        blacklist: 0,
        unknown: 1,
        vip: 2,
        employee: 3,
        visitor: 4,
        contractor: 5,
        whitelist: 6,
      };
      return (priority[a.listType] || 99) - (priority[b.listType] || 99);
    });
  }, [activeFaces]);

  if (sortedFaces.length === 0) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {/* SVG para linhas de conexão (opcional) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Pode adicionar linhas conectando rostos a labels, etc */}
      </svg>

      {/* Face boxes */}
      {sortedFaces.map(face => (
        <FaceBox
          key={face.id}
          face={face}
          showLabel={showLabels}
          showSimilarity={showSimilarity}
          showDetails={showDetails}
          animate={animateBoxes && (face.listType === 'blacklist' || face.listType === 'unknown')}
          onClick={() => onFaceClick?.(face)}
        />
      ))}

      {/* Stats panel */}
      <StatsPanel faces={sortedFaces} />

      {/* Alerta para blacklist */}
      {sortedFaces.some(f => f.listType === 'blacklist') && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white font-medium">
            <AlertTriangle className="w-5 h-5" />
            PESSOA BLOQUEADA DETECTADA
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HOOK: Use Face Detection Animation
// ============================================

export function useFaceDetectionAnimation(faces: DetectedFace[], intervalMs = 100) {
  const [visibleFaces, setVisibleFaces] = useState<DetectedFace[]>([]);

  useEffect(() => {
    // Adicionar novos rostos gradualmente
    const newFaces = faces.filter(
      f => !visibleFaces.some(vf => vf.id === f.id)
    );

    if (newFaces.length > 0) {
      newFaces.forEach((face, index) => {
        setTimeout(() => {
          setVisibleFaces(prev => [...prev, face]);
        }, index * intervalMs);
      });
    }

    // Remover rostos que não estão mais na lista
    const currentIds = new Set(faces.map(f => f.id));
    setVisibleFaces(prev => prev.filter(f => currentIds.has(f.id)));
  }, [faces, intervalMs]);

  return visibleFaces;
}

export default FaceRecognitionOverlay;
