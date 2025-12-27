/**
 * Advanced Color Picker Component
 * Full-featured color picker with gradients, palettes, and formats
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { Pipette, Copy, Check } from 'lucide-react';

export interface ColorPickerAdvancedProps {
  value?: string;
  onChange?: (color: string) => void;
  format?: 'hex' | 'rgb' | 'hsl';
  showAlpha?: boolean;
  showInput?: boolean;
  showPresets?: boolean;
  showEyeDropper?: boolean;
  presets?: string[];
  className?: string;
}

const DEFAULT_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#000000',
  '#ffffff', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6',
];

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number; a: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: result[4] ? parseInt(result[4], 16) / 255 : 1,
  } : { r: 0, g: 0, b: 0, a: 1 };
};

const rgbToHex = (r: number, g: number, b: number, a?: number): string => {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a !== undefined && a < 1 ? hex + toHex(a * 255) : hex;
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

export const ColorPickerAdvanced: React.FC<ColorPickerAdvancedProps> = ({
  value = '#3b82f6',
  onChange,
  format = 'hex',
  showAlpha = true,
  showInput = true,
  showPresets = true,
  showEyeDropper = true,
  presets = DEFAULT_PRESETS,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  
  const rgb = useMemo(() => hexToRgb(value), [value]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const h = parseInt(e.target.value);
    const { r, g, b } = hslToRgb(h, hsl.s, hsl.l);
    onChange?.(rgbToHex(r, g, b, showAlpha ? rgb.a : undefined));
  }, [hsl, rgb.a, showAlpha, onChange]);

  const handleSaturationLightnessChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const s = ((e.clientX - rect.left) / rect.width) * 100;
    const l = 100 - ((e.clientY - rect.top) / rect.height) * 100;
    const { r, g, b } = hslToRgb(hsl.h, Math.max(0, Math.min(100, s)), Math.max(0, Math.min(100, l)));
    onChange?.(rgbToHex(r, g, b, showAlpha ? rgb.a : undefined));
  }, [hsl.h, rgb.a, showAlpha, onChange]);

  const handleAlphaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const a = parseInt(e.target.value) / 100;
    onChange?.(rgbToHex(rgb.r, rgb.g, rgb.b, a));
  }, [rgb, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (/^#[0-9A-Fa-f]{0,8}$/.test(newValue)) {
      onChange?.(newValue);
    }
  }, [onChange]);

  const handleEyeDropper = useCallback(async () => {
    if ('EyeDropper' in window) {
      try {
        // @ts-ignore
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        onChange?.(result.sRGBHex);
      } catch (e) {
        console.log('Eye dropper cancelled');
      }
    }
  }, [onChange]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  const formatValue = useMemo(() => {
    switch (format) {
      case 'rgb':
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b}${rgb.a < 1 ? `, ${rgb.a.toFixed(2)}` : ''})`;
      case 'hsl':
        return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
      default:
        return value;
    }
  }, [format, rgb, hsl, value]);

  return (
    <div className={cn('color-picker-advanced w-64 p-3 bg-popover border rounded-lg shadow-lg', className)}>
      {/* Saturation/Lightness picker */}
      <div
        className="relative w-full h-40 rounded cursor-crosshair mb-3"
        style={{
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, transparent),
            hsl(${hsl.h}, 100%, 50%)
          `,
        }}
        onClick={handleSaturationLightnessChange}
        onMouseMove={(e) => e.buttons === 1 && handleSaturationLightnessChange(e)}
      >
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${hsl.s}%`,
            top: `${100 - hsl.l}%`,
            backgroundColor: value,
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max="360"
          value={hsl.h}
          onChange={handleHueChange}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          }}
        />
      </div>

      {/* Alpha slider */}
      {showAlpha && (
        <div className="mb-3">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(rgb.a * 100)}
            onChange={handleAlphaChange}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, transparent, ${value})`,
            }}
          />
        </div>
      )}

      {/* Input and controls */}
      {showInput && (
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-10 h-10 rounded border flex-shrink-0"
            style={{ backgroundColor: value }}
          />
          <input
            type="text"
            value={formatValue}
            onChange={handleInputChange}
            className="flex-1 px-2 py-1 text-sm border rounded bg-background"
          />
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-accent rounded transition-colors"
            title="Copiar cor"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          {showEyeDropper && 'EyeDropper' in window && (
            <button
              onClick={handleEyeDropper}
              className="p-2 hover:bg-accent rounded transition-colors"
              title="Capturar cor da tela"
            >
              <Pipette className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Presets */}
      {showPresets && (
        <div className="grid grid-cols-8 gap-1">
          {presets.map((preset, index) => (
            <button
              key={index}
              className={cn(
                'w-6 h-6 rounded border transition-transform hover:scale-110',
                value.toLowerCase() === preset.toLowerCase() && 'ring-2 ring-primary ring-offset-1'
              )}
              style={{ backgroundColor: preset }}
              onClick={() => onChange?.(preset)}
              title={preset}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorPickerAdvanced;
