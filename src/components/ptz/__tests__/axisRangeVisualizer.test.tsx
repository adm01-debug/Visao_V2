import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PtzAxisRangeVisualizer } from '../PtzAxisRangeVisualizer';

describe('PtzAxisRangeVisualizer', () => {
  it('renderiza posição dentro do intervalo calibrado', () => {
    render(
      <PtzAxisRangeVisualizer
        axis="pan"
        bounds={[-1, 1]}
        calibrated={{ min: -0.5, max: 0.5 }}
        position={0}
      />,
    );
    const el = screen.getByRole('img');
    expect(el.getAttribute('aria-label')).toContain('dentro do intervalo');
    const marker = el.querySelector('[data-testid="position-marker"] circle');
    expect(marker?.getAttribute('data-out-of-range')).toBe('false');
    expect(marker?.getAttribute('class') ?? '').toContain('fill-primary');
  });

  it('marca posição fora do intervalo com classe destrutiva', () => {
    render(
      <PtzAxisRangeVisualizer
        axis="pan"
        bounds={[-1, 1]}
        calibrated={{ min: -0.5, max: 0.5 }}
        position={0.8}
      />,
    );
    const el = screen.getByRole('img');
    expect(el.getAttribute('aria-label')).toContain('fora do intervalo');
    const marker = el.querySelector('[data-testid="position-marker"] circle');
    expect(marker?.getAttribute('data-out-of-range')).toBe('true');
    expect(marker?.getAttribute('class') ?? '').toContain('fill-destructive');
  });

  it('não renderiza marcas de observado quando não fornecido', () => {
    render(
      <PtzAxisRangeVisualizer
        axis="tilt"
        bounds={[-1, 1]}
        calibrated={{ min: -0.4, max: 0.6 }}
        position={0.1}
      />,
    );
    expect(screen.queryByTestId('observed-marks')).toBeNull();
  });

  it('renderiza marcas de observado quando fornecido', () => {
    render(
      <PtzAxisRangeVisualizer
        axis="tilt"
        bounds={[-1, 1]}
        calibrated={{ min: -0.4, max: 0.6 }}
        observed={{ min: -0.3, max: 0.5 }}
        position={0.1}
      />,
    );
    expect(screen.getByTestId('observed-marks')).toBeInTheDocument();
  });

  it('clampa visualmente posição acima do bound físico ao extremo direito', () => {
    render(
      <PtzAxisRangeVisualizer
        axis="zoom"
        bounds={[0, 1]}
        calibrated={{ min: 0.1, max: 0.9 }}
        position={2}
      />,
    );
    const el = screen.getByRole('img');
    const line = el.querySelector('[data-testid="position-marker"] line');
    const x1 = Number(line?.getAttribute('x1') ?? '0');
    // Bound direito é 100 - PAD_X (4) = 96
    expect(x1).toBeGreaterThanOrEqual(95);
    expect(x1).toBeLessThanOrEqual(100);
  });
});
