/**
 * Signature Pad Component
 * Digital signature capture with touch and mouse support
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Eraser, Download, Undo, Redo, Pen } from 'lucide-react';

export interface SignaturePadProps {
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  onSignatureChange?: (dataUrl: string | null) => void;
  onSignatureEnd?: (dataUrl: string) => void;
  disabled?: boolean;
  className?: string;
}

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  width = 400,
  height = 200,
  strokeColor = '#000000',
  strokeWidth = 2,
  backgroundColor = '#ffffff',
  onSignatureChange,
  onSignatureEnd,
  disabled = false,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentColor, setCurrentColor] = useState(strokeColor);
  const [currentWidth, setCurrentWidth] = useState(strokeWidth);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Save initial state
    const imageData = ctx.getImageData(0, 0, width, height);
    setHistory([imageData]);
    setHistoryIndex(0);
  }, [width, height, backgroundColor]);

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
        pressure: touch.force || 0.5,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth * (point.pressure || 1);
  }, [disabled, getPoint, currentColor, currentWidth]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const point = getPoint(e);
    ctx.lineWidth = currentWidth * (point.pressure || 1);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }, [isDrawing, disabled, getPoint, currentWidth]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);

    // Save to history
    const imageData = ctx.getImageData(0, 0, width, height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Notify
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange?.(dataUrl);
    onSignatureEnd?.(dataUrl);
  }, [isDrawing, width, height, history, historyIndex, onSignatureChange, onSignatureEnd]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    setIsEmpty(true);

    // Save to history
    const imageData = ctx.getImageData(0, 0, width, height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    onSignatureChange?.(null);
  }, [backgroundColor, width, height, history, historyIndex, onSignatureChange]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);

    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange?.(newIndex === 0 ? null : dataUrl);
  }, [historyIndex, history, onSignatureChange]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);

    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange?.(dataUrl);
  }, [historyIndex, history, onSignatureChange]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const link = document.createElement('a');
    link.download = 'assinatura.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [isEmpty]);

  return (
    <div className={cn('signature-pad', className)}>
      {/* Canvas */}
      <div className="relative border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            'touch-none cursor-crosshair',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Placeholder text */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
            Assine aqui
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {/* Color picker */}
          <div className="relative">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
              disabled={disabled}
            />
          </div>

          {/* Stroke width */}
          <div className="flex items-center gap-1">
            <Pen className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min="1"
              max="10"
              value={currentWidth}
              onChange={(e) => setCurrentWidth(parseInt(e.target.value))}
              className="w-20"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={disabled || historyIndex <= 0}
            className="p-2 rounded hover:bg-accent transition-colors disabled:opacity-50"
            title="Desfazer"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={disabled || historyIndex >= history.length - 1}
            className="p-2 rounded hover:bg-accent transition-colors disabled:opacity-50"
            title="Refazer"
          >
            <Redo className="h-4 w-4" />
          </button>
          <button
            onClick={clear}
            disabled={disabled || isEmpty}
            className="p-2 rounded hover:bg-accent transition-colors disabled:opacity-50"
            title="Limpar"
          >
            <Eraser className="h-4 w-4" />
          </button>
          <button
            onClick={download}
            disabled={disabled || isEmpty}
            className="p-2 rounded hover:bg-accent transition-colors disabled:opacity-50"
            title="Baixar"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
