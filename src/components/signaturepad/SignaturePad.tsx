import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Eraser, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  onSign?: (dataUrl: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({ onSign, width = 400, height = 200, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, [width, height]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
  };

  const end = () => { setDrawing(false); if (canvasRef.current) onSign?.(canvasRef.current.toDataURL()); };
  const clear = () => { const ctx = canvasRef.current?.getContext('2d'); if (ctx) { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height); } };

  return (
    <div className={cn('space-y-3', className)}>
      <canvas ref={canvasRef} width={width} height={height}
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
        className="border rounded-lg cursor-crosshair touch-none" />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear}><RotateCcw className="h-4 w-4 mr-1" />Limpar</Button>
        <a href={canvasRef.current?.toDataURL() || ''} download="assinatura.png">
          <Button size="sm"><Download className="h-4 w-4 mr-1" />Salvar</Button>
        </a>
      </div>
    </div>
  );
}

export default SignaturePad;
