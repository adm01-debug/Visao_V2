import { describe, it, expect } from 'vitest';
import { validatePolygon, dedupVertices, polygonArea, hasSelfIntersection } from '../zoneGeometry';

describe('zoneGeometry', () => {
  it('rejeita polígono com menos de 3 vértices', () => {
    const r = validatePolygon([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(r.ok).toBe(false);
  });

  it('dedup remove vértices consecutivos duplicados', () => {
    const cleaned = dedupVertices([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ]);
    expect(cleaned).toHaveLength(3);
  });

  it('calcula área correta de quadrado unitário', () => {
    const area = polygonArea([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
    expect(area).toBeCloseTo(1);
  });

  it('detecta auto-intersecção (bowtie)', () => {
    const bow = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    expect(hasSelfIntersection(bow)).toBe(true);
  });

  it('não flagra polígono convexo simples', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(hasSelfIntersection(square)).toBe(false);
  });

  it('rejeita área quase zero', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const r = validatePolygon(line);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('Área'))).toBe(true);
  });

  it('aceita polígono válido', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 0, y: 0.5 },
    ];
    const r = validatePolygon(square);
    expect(r.ok).toBe(true);
  });
});
