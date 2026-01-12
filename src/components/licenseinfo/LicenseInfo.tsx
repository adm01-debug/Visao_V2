import React from 'react';
import { cn } from '@/lib/utils';
import { Key, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

interface LicenseInfoProps {
  type: 'trial' | 'basic' | 'pro' | 'enterprise';
  expiresAt?: Date;
  cameras: { used: number; limit: number };
  isValid: boolean;
  className?: string;
}

const typeLabels = { trial: 'Trial', basic: 'Básico', pro: 'Profissional', enterprise: 'Enterprise' };

export function LicenseInfo({ type, expiresAt, cameras, isValid, className }: LicenseInfoProps) {
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className={cn('p-4 rounded-lg border', isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Key className="h-5 w-5" />
        <span className="font-medium">Licença {typeLabels[type]}</span>
        {isValid ? <CheckCircle className="h-4 w-4 text-green-500 ml-auto" /> : <AlertTriangle className="h-4 w-4 text-red-500 ml-auto" />}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Câmeras</span>
          <span className="font-medium">{cameras.used} / {cameras.limit}</span>
        </div>
        {expiresAt && (
          <div className="flex justify-between">
            <span>Expira em</span>
            <span className={cn('font-medium', daysLeft && daysLeft < 30 && 'text-yellow-600')}>{daysLeft} dias</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LicenseInfo;
