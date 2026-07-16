// Wave 41 — Anotador puro de snapshot (bounding box + label + score).
// Paridade Frigate: salva JPG com box desenhado. Núcleo puro, sem I/O nem DOM (recebe ctx).
// Consumido em ondas futuras pelo pipeline de snapshot (useClipRecorder / edge function).

export type ObjectClass = 'person' | 'vehicle' | 'plate' | 'face' | 'ppe' | 'other';

export interface DetectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  score?: number;
  objectClass?: ObjectClass;
  color?: string; // override HSL string
}

export interface FrameDims {
  width: number;
  height: number;
}

export interface AnnotateOptions {
  lineWidth?: number;
  font?: string;
  showScore?: boolean;
  labelPadding?: number;
  labelBgAlpha?: number;
}

// Paleta HSL determinística por classe. Consistente com design system (semântico).
// eslint-disable-next-line visao/no-hardcoded-colors -- Canvas 2D exige strings CSS resolvidas; ver mem://style/design-system-color-exceptions.
const COLOR_MAP: Record<ObjectClass, string> = {
  person: 'hsl(210, 90%, 55%)',
  vehicle: 'hsl(38, 92%, 50%)',
  plate: 'hsl(142, 76%, 40%)',
  face: 'hsl(280, 70%, 60%)',
  ppe: 'hsl(48, 96%, 50%)',
  other: 'hsl(215, 20%, 55%)',
};

const DEFAULT_OPTS: Required<AnnotateOptions> = {
  lineWidth: 2,
  font: '14px sans-serif',
  showScore: true,
  labelPadding: 4,
  labelBgAlpha: 0.7,
};

export function resolveBoxColor(objectClass?: ObjectClass, override?: string): string {
  if (override) return override;
  if (!objectClass) return COLOR_MAP.other;
  return COLOR_MAP[objectClass] ?? COLOR_MAP.other;
}

export function clampBox(box: DetectionBox, frame: FrameDims): DetectionBox | null {
  if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.w) || !Number.isFinite(box.h)) {
    return null;
  }
  // Normaliza box invertido (w/h negativos)
  let x = box.w < 0 ? box.x + box.w : box.x;
  let y = box.h < 0 ? box.y + box.h : box.y;
  let w = Math.abs(box.w);
  let h = Math.abs(box.h);

  // Clamp aos limites do frame
  if (x < 0) { w += x; x = 0; }
  if (y < 0) { h += y; y = 0; }
  if (x + w > frame.width) w = frame.width - x;
  if (y + h > frame.height) h = frame.height - y;

  if (w <= 0 || h <= 0) return null;
  if (x >= frame.width || y >= frame.height) return null;

  return { ...box, x, y, w, h };
}

function formatLabel(det: DetectionBox, showScore: boolean): string {
  const parts: string[] = [];
  if (det.label) parts.push(det.label);
  else if (det.objectClass) parts.push(det.objectClass);
  if (showScore && typeof det.score === 'number' && Number.isFinite(det.score)) {
    parts.push(`${Math.round(det.score * 100)}%`);
  }
  return parts.join(' ');
}

export function annotateFrame(
  ctx: CanvasRenderingContext2D,
  frame: FrameDims,
  detections: readonly DetectionBox[],
  opts: AnnotateOptions = {},
): number {
  const o = { ...DEFAULT_OPTS, ...opts };
  let drawn = 0;

  for (const raw of detections) {
    const box = clampBox(raw, frame);
    if (!box) continue;

    const color = resolveBoxColor(box.objectClass, box.color);

    // Box
    ctx.lineWidth = o.lineWidth;
    ctx.strokeStyle = color;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    // Label
    const text = formatLabel(box, o.showScore);
    if (text) {
      ctx.font = o.font;
      const textWidth = ctx.measureText(text).width;
      const textHeight = 14; // aproximação; canvas 2D não expõe height confiável
      const pad = o.labelPadding;
      const bgW = textWidth + pad * 2;
      const bgH = textHeight + pad * 2;

      // Posiciona label acima do box; se não couber, dentro do topo do box
      let bgX = box.x;
      let bgY = box.y - bgH;
      if (bgY < 0) bgY = box.y;
      if (bgX + bgW > frame.width) bgX = Math.max(0, frame.width - bgW);

      // Fundo semi-opaco
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = o.labelBgAlpha;
      ctx.fillStyle = color;
      ctx.fillRect(bgX, bgY, bgW, bgH);
      ctx.globalAlpha = prevAlpha;

      // Texto
      // eslint-disable-next-line visao/no-hardcoded-colors -- Canvas exige string CSS; branco garante contraste sobre HSL saturado.
      ctx.fillStyle = 'hsl(0, 0%, 100%)';
      ctx.textBaseline = 'top';
      ctx.fillText(text, bgX + pad, bgY + pad);
    }

    drawn++;
  }

  return drawn;
}
