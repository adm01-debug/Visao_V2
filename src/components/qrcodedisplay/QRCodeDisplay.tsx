import React from 'react';
import { cn } from '@/lib/utils';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ value, size = 200, className }: QRCodeDisplayProps) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

  return (
    <div className={cn('inline-block p-4 bg-white rounded-lg', className)}>
      <img src={qrUrl} alt="QR Code" width={size} height={size} className="block" />
      <p className="text-xs text-center text-muted-foreground mt-2 truncate max-w-[200px]">{value}</p>
    </div>
  );
}

export default QRCodeDisplay;
