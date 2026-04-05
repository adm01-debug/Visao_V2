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
  whitelist: { borderColor: 'border-success', bgColor: 'bg-success/90', textColor: 'text-success', icon: UserCheck, label: 'Autorizado' },
  blacklist: { borderColor: 'border-destructive', bgColor: 'bg-destructive/90', textColor: 'text-destructive', icon: Ban, label: 'Bloqueado' },
  vip: { borderColor: 'border-warning', bgColor: 'bg-warning/90', textColor: 'text-warning', icon: Star, label: 'VIP' },
  employee: { borderColor: 'border-primary', bgColor: 'bg-primary/90', textColor: 'text-primary', icon: User, label: 'Funcionário' },
  visitor: { borderColor: 'border-primary/70', bgColor: 'bg-primary/70', textColor: 'text-primary', icon: User, label: 'Visitante' },
  contractor: { borderColor: 'border-warning', bgColor: 'bg-warning/90', textColor: 'text-warning', icon: Shield, label: 'Terceiro' },
  unknown: { borderColor: 'border-muted-foreground', bgColor: 'bg-muted-foreground/90', textColor: 'text-muted-foreground', icon: AlertTriangle, label: 'Desconhecido' },
};

export const FACE_PRIORITY: Record<ListType, number> = {
  blacklist: 0, unknown: 1, vip: 2, employee: 3, visitor: 4, contractor: 5, whitelist: 6,
};
