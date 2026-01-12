import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Download, FileVideo, FileImage, File, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportOption {
  format: 'mp4' | 'avi' | 'jpg' | 'png' | 'pdf' | 'csv';
  label: string;
}

interface ExportButtonProps {
  options?: ExportOption[];
  onExport: (format: string) => void;
  disabled?: boolean;
  className?: string;
}

const defaultOptions: ExportOption[] = [
  { format: 'mp4', label: 'Vídeo MP4' },
  { format: 'jpg', label: 'Imagem JPG' },
  { format: 'pdf', label: 'Relatório PDF' },
  { format: 'csv', label: 'Dados CSV' },
];

const icons = { mp4: FileVideo, avi: FileVideo, jpg: FileImage, png: FileImage, pdf: File, csv: File };

export function ExportButton({ options = defaultOptions, onExport, disabled = false, className }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)} disabled={disabled}>
        <Download className="h-4 w-4 mr-2" />
        Exportar
        <ChevronDown className={cn('h-4 w-4 ml-2 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-popover border rounded-lg shadow-lg z-50 min-w-[160px]">
          {options.map(opt => {
            const Icon = icons[opt.format] || File;
            return (
              <button key={opt.format}
                onClick={() => { onExport(opt.format); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExportButton;
