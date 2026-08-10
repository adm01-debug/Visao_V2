/**
 * Snapshot test de dimensões reservadas pelos skeletons.
 *
 * Em vez de comparar pixels (que jsdom não calcula), capturamos um
 * "fingerprint" estrutural: classes de altura/min-height + aspect-ratio
 * inline + contagem de linhas. Se algum skeleton mudar a altura
 * reservada (causando CLS na transição loading → dados), o snapshot
 * falha e exige atualização explícita.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CamerasSkeleton } from '../CamerasSkeleton';
import { AlertsSkeleton } from '../AlertsSkeleton';
import { ZonesSkeleton } from '../ZonesSkeleton';

/** Regex para extrair classes que afetam altura reservada. */
const HEIGHT_CLASS = /(?:^|\s)(h-\[?[\w./-]+\]?|min-h-\[?[\w./()-]+\]?|aspect-\w+)/g;

interface DimensionFingerprint {
  tag: string;
  /** Classes de dimensão extraídas (ordenadas para estabilidade). */
  dims: string[];
  /** aspect-ratio inline, se houver. */
  aspectRatio?: string;
  children: DimensionFingerprint[];
}

function fingerprint(el: Element): DimensionFingerprint {
  const className = el.getAttribute('class') ?? '';
  const matches = Array.from(className.matchAll(HEIGHT_CLASS)).map((m) => m[1]);
  const aspectRatio = (el as HTMLElement).style?.aspectRatio || undefined;
  const node: DimensionFingerprint = {
    tag: el.tagName.toLowerCase(),
    dims: matches.sort(),
    children: Array.from(el.children).map(fingerprint),
  };
  if (aspectRatio) node.aspectRatio = aspectRatio;
  return node;
}

describe('Snapshots de dimensões dos skeletons (anti-CLS)', () => {
  it('CamerasSkeleton: footprint vertical estável', () => {
    const { container } = render(<CamerasSkeleton />);
    expect(fingerprint(container.firstElementChild!)).toMatchSnapshot();
  });

  it('AlertsSkeleton: footprint vertical estável', () => {
    const { container } = render(<AlertsSkeleton />);
    expect(fingerprint(container.firstElementChild!)).toMatchSnapshot();
  });

  it('ZonesSkeleton: footprint vertical estável', () => {
    const { container } = render(<ZonesSkeleton />);
    expect(fingerprint(container.firstElementChild!)).toMatchSnapshot();
  });

  it('CamerasSkeleton: cards de câmera com aspect-ratio 16/9', () => {
    const { container } = render(<CamerasSkeleton />);
    const cards = container.querySelectorAll('[style*="aspect-ratio"]');
    const ratios = Array.from(cards).map((c) => (c as HTMLElement).style.aspectRatio);
    expect(ratios).toMatchSnapshot();
    expect(ratios.length).toBe(8);
    ratios.forEach((r) => expect(r).toBe('16 / 9'));
  });

  it('AlertsSkeleton: 8 linhas de tabela com min-h fixo', () => {
    const { container } = render(<AlertsSkeleton />);
    const tables = container.querySelectorAll('.rounded-lg.border');
    const table = tables[tables.length - 1];
    const rows = Array.from(table.children).slice(1); // skip header
    const heights = rows.map((r) => {
      const cls = r.getAttribute('class') ?? '';
      return cls.match(/min-h-\[\d+px\]/)?.[0];
    });
    expect(heights).toMatchSnapshot();
    expect(heights.every((h) => h === 'min-h-[72px]')).toBe(true);
  });

  it('ZonesSkeleton: canvas principal e sidebar mantêm reserva', () => {
    const { container } = render(<ZonesSkeleton />);
    const canvas = container.querySelector('[style*="aspect-ratio"]') as HTMLElement;
    const sidebar = container.querySelector('.min-h-\\[400px\\]');
    expect({
      canvasAspectRatio: canvas?.style.aspectRatio,
      sidebarReserved: !!sidebar,
      sidebarChildren: sidebar?.children.length,
    }).toMatchSnapshot();
  });
});
