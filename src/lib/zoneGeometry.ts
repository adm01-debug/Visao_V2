/**
 * VISÃO — Wave 3: Validação geométrica de zonas
 * Rejeita polígonos degenerados antes de persistir.
 */
import type { Point } from '@/types/zones/types';

export interface GeometryValidation {
  ok: boolean;
  errors: string[];
  cleaned: Point[];
}

const EPSILON = 1e-6;
const MIN_AREA = 0.0001; // 0.01% da imagem normalizada

export function dedupVertices(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > EPSILON || Math.abs(last.y - p.y) > EPSILON) {
      out.push(p);
    }
  }
  // remove trailing duplicate of first
  if (out.length > 1) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (Math.abs(first.x - last.x) < EPSILON && Math.abs(first.y - last.y) < EPSILON) {
      out.pop();
    }
  }
  return out;
}

export function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const pi = points[i]!;
    const pj = points[j]!;
    area += pi.x * pj.y - pj.x * pi.y;
  }
  return Math.abs(area / 2);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const ccw = (p: Point, q: Point, r: Point) =>
    (r.y - p.y) * (q.x - p.x) - (q.y - p.y) * (r.x - p.x);
  const d1 = ccw(c, d, a);
  const d2 = ccw(c, d, b);
  const d3 = ccw(a, b, c);
  const d4 = ccw(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function hasSelfIntersection(points: Point[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    for (let j = i + 2; j < n; j++) {
      // skip adjacent segment (including wrap-around)
      if (i === 0 && j === n - 1) continue;
      const c = points[j]!;
      const d = points[(j + 1) % n]!;
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

export function validatePolygon(points: Point[]): GeometryValidation {
  const errors: string[] = [];
  const cleaned = dedupVertices(points);
  if (cleaned.length < 3) errors.push('Polígono precisa de pelo menos 3 vértices distintos');
  if (cleaned.length >= 3) {
    const area = polygonArea(cleaned);
    if (area < MIN_AREA) errors.push('Área do polígono é muito pequena');
    if (hasSelfIntersection(cleaned)) errors.push('Polígono não pode se auto-cruzar');
  }
  return { ok: errors.length === 0, errors, cleaned };
}
