import React from 'react';
import { cn } from '@/lib/utils';
import { Download, Share2, Printer, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportMenuProps { onDownload?: () => void; onShare?: () => void; onPrint?: () => void; onCopy?: () => void; className?: string; }

export function ExportMenu({ onDownload, onShare, onPrint, onCopy, className }: ExportMenuProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {onDownload && <Button variant="outline" size="sm" onClick={onDownload}><Download className="h-4 w-4 mr-2" />Download</Button>}
      {onShare && <Button variant="outline" size="sm" onClick={onShare}><Share2 className="h-4 w-4 mr-2" />Compartilhar</Button>}
      {onPrint && <Button variant="outline" size="sm" onClick={onPrint}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>}
      {onCopy && <Button variant="outline" size="sm" onClick={onCopy}><Copy className="h-4 w-4 mr-2" />Copiar</Button>}
    </div>
  );
}

export default ExportMenu;
