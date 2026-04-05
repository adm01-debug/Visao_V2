import React from 'react';
import { User, UserCheck, UserX, Star, AlertTriangle, Shield, Clock, Ban } from 'lucide-react';

export type ListType = 'whitelist' | 'blacklist' | 'vip' | 'employee' | 'visitor' | 'contractor' | 'unknown';

export interface DetectedFace {
  id: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  personId?: string;
  personName?: string;
  listType: ListType;
  similarity?: number;
  isKnown: boolean;
  timestamp: Date;
  emotions?: { dominant: string; confidence: number };
  age?: { min: number; max: number };
  gender?: { value: string; confidence: number };
}

export interface FaceRecognitionOverlayProps {
  faces: DetectedFace[];
  showLabels?: boolean;
  showSimilarity?: boolean;
  showDetails?: boolean;
  animateBoxes?: boolean;
  className?: string;
  onFaceClick?: (face: DetectedFace) => void;
}

export const listTypeStyles: Record<ListType, {
  borderColor: string;
  bgColor: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = {
  whitelist: { borderColor: 'border-green-500', bgColor: 'bg-green-500/90', textColor: 'text-green-500', icon: UserCheck, label: 'Autorizado' },
  blacklist: { borderColor: 'border-red-500', bgColor: 'bg-red-500/90', textColor: 'text-red-500', icon: Ban, label: 'Bloqueado' },
  vip: { borderColor: 'border-yellow-500', bgColor: 'bg-yellow-500/90', textColor: 'text-yellow-500', icon: Star, label: 'VIP' },
  employee: { borderColor: 'border-blue-500', bgColor: 'bg-blue-500/90', textColor: 'text-blue-500', icon: User, label: 'Funcionário' },
  visitor: { borderColor: 'border-purple-500', bgColor: 'bg-purple-500/90', textColor: 'text-purple-500', icon: User, label: 'Visitante' },
  contractor: { borderColor: 'border-orange-500', bgColor: 'bg-orange-500/90', textColor: 'text-orange-500', icon: Shield, label: 'Terceiro' },
  unknown: { borderColor: 'border-gray-400', bgColor: 'bg-gray-600/90', textColor: 'text-gray-400', icon: AlertTriangle, label: 'Desconhecido' },
};

export const FACE_PRIORITY: Record<ListType, number> = {
  blacklist: 0, unknown: 1, vip: 2, employee: 3, visitor: 4, contractor: 5, whitelist: 6,
};
