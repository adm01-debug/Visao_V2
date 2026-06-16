/**
 * Garante que os placeholders de filtros/tabs/grid permanecem visíveis
 * enquanto os dados estão carregando nas páginas Câmeras, Alertas e Zonas.
 *
 * Estes testes evitam regressões de CLS — se um skeleton sumir antes
 * dos dados chegarem, o conteúdo "salta" durante o load.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CamerasSkeleton } from '../CamerasSkeleton';
import { AlertsSkeleton } from '../AlertsSkeleton';
import { ZonesSkeleton } from '../ZonesSkeleton';
import { FiltersBarSkeleton } from '../FiltersBarSkeleton';
import { TabsSkeleton } from '../TabsSkeleton';

describe('Loading placeholders permanecem renderizados durante o loading', () => {
  describe('CamerasSkeleton', () => {
    it('expõe role="status" e aria-busy="true"', () => {
      render(<CamerasSkeleton />);
      const status = screen.getByRole('status', { name: /carregando câmeras/i });
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('renderiza placeholder de filtros (search + select + view switcher)', () => {
      render(<CamerasSkeleton />);
      const filters = screen.getByRole('status', { name: /carregando filtros/i });
      expect(filters).toBeInTheDocument();
      expect(filters).toHaveAttribute('aria-busy', 'true');
    });

    it('mantém o grid de cards de câmera com aspect-ratio reservado', () => {
      const { container } = render(<CamerasSkeleton />);
      // 8 cards: cada um possui aspectRatio inline 16/9
      const aspectMedia = container.querySelectorAll('[style*="aspect-ratio"]');
      expect(aspectMedia.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('AlertsSkeleton', () => {
    it('expõe role="status" e aria-busy="true"', () => {
      render(<AlertsSkeleton />);
      const status = screen.getByRole('status', { name: /carregando alertas/i });
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-busy', 'true');
    });

    it('reserva espaço para barra de filtros (botões de severidade)', () => {
      const { container } = render(<AlertsSkeleton />);
      // Os filtros são 4 chips de h-10 w-28 dentro de um flex
      const filterRow = container.querySelector('.flex.gap-3');
      expect(filterRow).not.toBeNull();
      expect(filterRow?.children.length).toBe(4);
    });

    it('renderiza header de tabela + 8 linhas reservadas', () => {
      const { container } = render(<AlertsSkeleton />);
      // Tabela é o último .rounded-lg.border (após stat cards)
      const tables = container.querySelectorAll('.rounded-lg.border');
      const table = tables[tables.length - 1];
      expect(table).toBeDefined();
      // 1 header + 8 rows = 9 filhos diretos
      expect(table.children.length).toBe(9);
    });
  });

  describe('ZonesSkeleton', () => {
    it('expõe role="status" e aria-busy="true"', () => {
      render(<ZonesSkeleton />);
      const status = screen.getByRole('status', { name: /carregando zonas/i });
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-busy', 'true');
    });

    it('reserva espaço para canvas de zona (aspect-ratio 16/9)', () => {
      const { container } = render(<ZonesSkeleton />);
      const aspectMedia = container.querySelector('[style*="aspect-ratio"]');
      expect(aspectMedia).not.toBeNull();
    });

    it('mantém lista lateral com 4 placeholders de zona', () => {
      const { container } = render(<ZonesSkeleton />);
      const sidebar = container.querySelector('.space-y-4.min-h-\\[400px\\]');
      expect(sidebar).not.toBeNull();
      // 1 título + 4 cards de zona
      expect(sidebar?.children.length).toBe(5);
    });
  });

  describe('FiltersBarSkeleton (placeholder dedicado)', () => {
    it('renderiza search + N selects + view switcher', () => {
      const { container } = render(
        <FiltersBarSkeleton selectsCount={3} showViewSwitcher showResetButton />,
      );
      const status = screen.getByRole('status', { name: /carregando filtros/i });
      expect(status).toBeInTheDocument();
      // 3 selects + 1 reset, dentro do segundo grupo
      const selectsGroup = container.querySelector('.flex.items-center.gap-2');
      expect(selectsGroup?.children.length).toBe(4);
      // view switcher tem 3 botões
      const switcher = container.querySelector('.ml-auto');
      expect(switcher?.children.length).toBe(3);
    });

    it('reserva altura mínima para evitar CLS', () => {
      const { container } = render(<FiltersBarSkeleton />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/min-h-\[96px\]/);
      expect(root.className).toMatch(/sm:min-h-\[40px\]/);
    });
  });

  describe('TabsSkeleton (placeholder dedicado)', () => {
    it('renderiza N tabs com altura fixa h-10', () => {
      const { container } = render(<TabsSkeleton tabsCount={4} />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/h-10/);
      // Não usamos getByRole pois Skeleton tem aria-hidden; conferimos filhos
      expect(root.children.length).toBe(4);
    });
  });
});
