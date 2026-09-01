/**
 * Resiliência anti-tela-em-branco:
 *  1. Quando um skeleton branded LANÇA durante o render → SkeletonErrorBoundary
 *     captura e renderiza SkeletonFallback (com role="status" + aria-label).
 *  2. Quando um lazy chunk REJEITA o import dinâmico → o boundary externo do
 *     withLazyLoad captura e exibe SkeletonFallback.
 *  3. O fallback do Suspense (skeleton branded) também está envolto por boundary,
 *     então uma falha do próprio fallback NÃO derruba a árvore.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SkeletonErrorBoundary } from '../SkeletonErrorBoundary';
import { withLazyLoad } from '@/lib/lazyLoad';

// Silencia o ruído esperado do React em DEV ao capturar o erro do boundary.
let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

function ThrowingSkeleton(): React.JSX.Element {
  throw new Error('branded skeleton crashed');
}

describe('SkeletonErrorBoundary — branded skeleton crash', () => {
  it('renderiza SkeletonFallback quando o skeleton interno lança', () => {
    render(
      <SkeletonErrorBoundary>
        <ThrowingSkeleton />
      </SkeletonErrorBoundary>
    );

    const fallback = screen.getByRole('status', { name: /carregando/i });
    expect(fallback).toBeInTheDocument();
    // Sanity: não ficou árvore vazia (tela branca).
    expect(fallback.querySelectorAll('div').length).toBeGreaterThan(0);
  });

  it('respeita label customizado no fallback', () => {
    render(
      <SkeletonErrorBoundary label="Carregando câmeras…">
        <ThrowingSkeleton />
      </SkeletonErrorBoundary>
    );
    expect(screen.getByRole('status', { name: 'Carregando câmeras…' })).toBeInTheDocument();
  });
});

describe('withLazyLoad — lazy chunk rejection', () => {
  it('exibe SkeletonFallback quando o import dinâmico rejeita', async () => {
    const Lazy = withLazyLoad(() => Promise.reject(new Error('chunk load failed')));

    render(<Lazy />);

    // O boundary externo captura a rejeição do lazy e troca para o fallback.
    await waitFor(() => {
      expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument();
    });

    // Garante que NÃO há tela branca: o container tem nós renderizados.
    const fallback = screen.getByRole('status');
    expect(fallback.children.length).toBeGreaterThan(0);
  });

  it('renderiza o componente normalmente quando o lazy resolve', async () => {
    const Resolved = () => <div>conteúdo real</div>;
    const Lazy = withLazyLoad(() => Promise.resolve({ default: Resolved }));

    render(<Lazy />);

    await waitFor(() => {
      expect(screen.getByText('conteúdo real')).toBeInTheDocument();
    });
  });

  it('sobrevive quando o PRÓPRIO fallback do Suspense lança (boundary aninhado)', async () => {
    // Skeleton branded que falha ao montar — simula chunk de skeleton corrompido.
    const BrokenFallback = () => {
      throw new Error('branded fallback crashed');
    };

    // Lazy nunca resolve → mantém o Suspense exibindo o fallback (que é o quebrado).
    const NeverResolves = withLazyLoad(
      () => new Promise<{ default: React.ComponentType }>(() => {}),
      <BrokenFallback />
    );

    render(<NeverResolves />);

    // Mesmo com fallback quebrado, NÃO fica tela em branco: o boundary INTERNO
    // (que envolve o fallback do Suspense) renderiza o SkeletonFallback genérico.
    await waitFor(() => {
      expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument();
    });
  });
});
