import React from 'react';
import { cn } from '@/lib/utils';
import { User, UserX, Shield, ShieldAlert } from 'lucide-react';
import { Avatar } from '@/components/media/Avatar';

interface RecognizedFace {
  id: string;
  name?: string;
  confidence: number;
  status: 'known' | 'unknown' | 'authorized' | 'blocked';
  image?: string;
}

interface FaceRecognitionProps {
  faces: RecognizedFace[];
  onFaceClick?: (face: RecognizedFace) => void;
  className?: string;
}

const statusConfig = {
  known: { icon: User, color: 'text-blue-500', bg: 'bg-blue-50' },
  unknown: { icon: UserX, color: 'text-gray-500', bg: 'bg-gray-50' },
  authorized: { icon: Shield, color: 'text-green-500', bg: 'bg-green-50' },
  blocked: { icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50' },
};

export function FaceRecognition({ faces, onFaceClick, className }: FaceRecognitionProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {faces.map(face => {
        const config = statusConfig[face.status];
        const Icon = config.icon;
        return (
          <div key={face.id} onClick={() => onFaceClick?.(face)}
            className={cn('flex items-center gap-3 p-2 rounded-lg', config.bg, onFaceClick && 'cursor-pointer')}>
            <Avatar src={face.image} name={face.name || 'Desconhecido'} size="sm" />
            <div className="flex-1">
              <p className="font-medium text-sm">{face.name || 'Desconhecido'}</p>
              <p className="text-xs text-muted-foreground">{(face.confidence * 100).toFixed(0)}% confiança</p>
            </div>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
        );
      })}
    </div>
  );
}

export default FaceRecognition;
