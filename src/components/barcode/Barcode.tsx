import React from 'react';
import { cn } from '@/lib/utils';

interface BarcodeProps {
  value: string;
  format?: 'code128' | 'ean13' | 'upc';
  width?: number;
  height?: number;
  className?: string;
}

export function Barcode({ value, format = 'code128', width = 2, height = 100, className }: BarcodeProps) {
  const barcodeUrl = `https://barcodeapi.org/api/${format}/${encodeURIComponent(value)}`;

  return (
    <div className={cn('inline-block p-4 bg-white rounded-lg text-center', className)}>
      <img src={barcodeUrl} alt={`Barcode: ${value}`} style={{ height }} className="mx-auto" />
      <p className="text-xs text-muted-foreground mt-2 font-mono">{value}</p>
    </div>
  );
}

export default Barcode;
