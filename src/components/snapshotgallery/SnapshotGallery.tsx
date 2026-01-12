import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Thumbnail } from '@/components/thumbnail/Thumbnail';
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Snapshot {
  id: string;
  src: string;
  timestamp: string;
  camera?: string;
}

interface SnapshotGalleryProps {
  snapshots: Snapshot[];
  onDownload?: (snapshot: Snapshot) => void;
  onDelete?: (snapshot: Snapshot) => void;
  className?: string;
}

export function SnapshotGallery({ snapshots, onDownload, onDelete, className }: SnapshotGalleryProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const prev = () => setSelected(i => i !== null ? (i - 1 + snapshots.length) % snapshots.length : null);
  const next = () => setSelected(i => i !== null ? (i + 1) % snapshots.length : null);

  return (
    <>
      <div className={cn('grid grid-cols-4 gap-2', className)}>
        {snapshots.map((s, i) => (
          <div key={s.id} className="relative group">
            <Thumbnail src={s.src} aspectRatio="16:9" onClick={() => setSelected(i)} />
            <p className="text-xs text-muted-foreground mt-1 truncate">{s.timestamp}</p>
          </div>
        ))}
      </div>
      {selected !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-white"><X className="h-6 w-6" /></button>
          <button onClick={prev} className="absolute left-4 text-white"><ChevronLeft className="h-8 w-8" /></button>
          <div className="max-w-4xl">
            <img src={snapshots[selected].src} alt="" className="max-h-[80vh]" />
            <div className="flex items-center justify-between mt-4 text-white">
              <div>
                <p>{snapshots[selected].timestamp}</p>
                {snapshots[selected].camera && <p className="text-sm text-gray-400">{snapshots[selected].camera}</p>}
              </div>
              <div className="flex gap-2">
                {onDownload && <Button variant="secondary" size="sm" onClick={() => onDownload(snapshots[selected])}><Download className="h-4 w-4 mr-1" />Download</Button>}
                {onDelete && <Button variant="destructive" size="sm" onClick={() => onDelete(snapshots[selected])}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>}
              </div>
            </div>
          </div>
          <button onClick={next} className="absolute right-4 text-white"><ChevronRight className="h-8 w-8" /></button>
        </div>
      )}
    </>
  );
}

export default SnapshotGallery;
