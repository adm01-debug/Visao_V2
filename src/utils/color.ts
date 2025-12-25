export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null; };
export const rgbToHex = (r: number, g: number, b: number): string => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
export const lighten = (hex: string, amount: number): string => { const rgb = hexToRgb(hex); if (!rgb) return hex; return rgbToHex(Math.min(255, rgb.r + amount), Math.min(255, rgb.g + amount), Math.min(255, rgb.b + amount)); };
export const darken = (hex: string, amount: number): string => lighten(hex, -amount);
export const opacity = (hex: string, alpha: number): string => { const rgb = hexToRgb(hex); return rgb ? \`rgba(\${rgb.r}, \${rgb.g}, \${rgb.b}, \${alpha})\` : hex; };
export const isLight = (hex: string): boolean => { const rgb = hexToRgb(hex); return rgb ? (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) > 186 : true; };
export const contrastColor = (hex: string): string => isLight(hex) ? '#000000' : '#ffffff';
