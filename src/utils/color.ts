/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Color Utilities - Manipulação de cores
 * 
 * @module utils/color
 */

// ============================================
// TIPOS
// ============================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface RGBA extends RGB {
  a: number;
}

// ============================================
// CONVERSÕES HEX <-> RGB
// ============================================

/**
 * Converter HEX para RGB
 * @param hex Cor em formato hexadecimal (#RRGGBB ou #RGB)
 */
export const hexToRgb = (hex: string): RGB | null => {
  // Remover # se presente
  const cleanHex = hex.replace(/^#/, '');
  
  // Suportar formato curto (#RGB)
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  
  if (!result) return null;
  
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

/**
 * Converter RGB para HEX
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (val: number): number => Math.max(0, Math.min(255, Math.round(val)));
  
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
};

// ============================================
// CONVERSÕES RGB <-> HSL
// ============================================

/**
 * Converter RGB para HSL
 */
export const rgbToHsl = (r: number, g: number, b: number): HSL => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h = 0;
  switch (max) {
    case rNorm:
      h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
      break;
    case gNorm:
      h = ((bNorm - rNorm) / d + 2) / 6;
      break;
    case bNorm:
      h = ((rNorm - gNorm) / d + 4) / 6;
      break;
  }
  
  return { h, s, l };
};

/**
 * Converter HSL para RGB
 */
export const hslToRgb = (h: number, s: number, l: number): RGB => {
  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }
  
  const hue2rgb = (p: number, q: number, t: number): number => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
};

// ============================================
// MANIPULAÇÃO DE CORES
// ============================================

/**
 * Clarear cor
 * @param hex Cor original
 * @param amount Quantidade (0-255)
 */
export const lighten = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return rgbToHex(
    rgb.r + amount,
    rgb.g + amount,
    rgb.b + amount
  );
};

/**
 * Escurecer cor
 * @param hex Cor original
 * @param amount Quantidade (0-255)
 */
export const darken = (hex: string, amount: number): string => {
  return lighten(hex, -amount);
};

/**
 * Ajustar saturação
 * @param hex Cor original
 * @param amount Quantidade (-1 a 1)
 */
export const saturate = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.s = Math.max(0, Math.min(1, hsl.s + amount));
  
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

/**
 * Aplicar opacidade (retorna rgba)
 * @param hex Cor original
 * @param alpha Opacidade (0-1)
 */
export const opacity = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
};

// ============================================
// ANÁLISE DE CORES
// ============================================

/**
 * Verificar se cor é clara
 * @param hex Cor a verificar
 * @returns True se clara (deve usar texto escuro)
 */
export const isLight = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  
  // Fórmula de luminância relativa
  const luminance = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
  return luminance > 186;
};

/**
 * Obter cor de contraste
 * @param hex Cor de fundo
 * @returns Preto ou branco para melhor contraste
 */
export const contrastColor = (hex: string): string => {
  return isLight(hex) ? '#000000' : '#ffffff';
};

/**
 * Calcular luminância relativa
 * @param hex Cor
 * @returns Luminância (0-1)
 */
export const luminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const sRGB = val / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Calcular ratio de contraste entre duas cores
 * @param hex1 Primeira cor
 * @param hex2 Segunda cor
 * @returns Ratio de contraste (1-21)
 */
export const contrastRatio = (hex1: string, hex2: string): number => {
  const lum1 = luminance(hex1);
  const lum2 = luminance(hex2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// ============================================
// GERAÇÃO DE CORES
// ============================================

/**
 * Gerar cor aleatória
 */
export const randomColor = (): string => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
};

/**
 * Misturar duas cores
 * @param hex1 Primeira cor
 * @param hex2 Segunda cor
 * @param weight Peso da primeira cor (0-1)
 */
export const mix = (hex1: string, hex2: string, weight = 0.5): string => {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return hex1;
  
  const w = Math.max(0, Math.min(1, weight));
  
  return rgbToHex(
    Math.round(rgb1.r * w + rgb2.r * (1 - w)),
    Math.round(rgb1.g * w + rgb2.g * (1 - w)),
    Math.round(rgb1.b * w + rgb2.b * (1 - w))
  );
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  lighten,
  darken,
  saturate,
  opacity,
  isLight,
  contrastColor,
  luminance,
  contrastRatio,
  randomColor,
  mix,
};
