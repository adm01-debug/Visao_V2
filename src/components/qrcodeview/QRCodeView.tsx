import React from 'react';
import { cn } from '@/lib/utils';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRCodeViewProps {
  value: string;
  size?: number;
  title?: string;
  onDownload?: () => void;
  onCopy?: () => void;
  className?: string;
}

export function QRCodeView({ value, size = 200, title, onDownload, onCopy, className }: QRCodeViewProps) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

  return (
    <div className={cn('p-4 rounded-lg border bg-card text-center', className)}>
      {title && <h4 className="font-medium mb-3">{title}</h4>}
      <div className="inline-block p-4 bg-white rounded-lg">
        <img src={qrUrl} alt="QR Code" width={size} height={size} />
      </div>
      <p className="text-xs text-muted-foreground mt-2 break-all max-w-[200px] mx-auto">{value}</p>
      <div className="flex justify-center gap-2 mt-3">
        {onDownload && <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-4 w-4 mr-1" />Baixar</Button>}
        {onCopy && <Button size="sm" variant="outline" onClick={onCopy}><Copy className="h-4 w-4 mr-1" />Copiar</Button>}
      </div>
    </div>
  );
}

export default QRCodeView;
