import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { EpisodeBridgeCard } from '../EpisodeBridgeCard';
import { assessEpisodeBridge } from '@/lib/retention/episodeBridgeWatch';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);
const at = (hoursAgo: number, abandonedOpen: number) => ({
  executedAt: NOW - hoursAgo * HOUR,
  abandonedOpen,
});

const renderCard = (samples: Parameters<typeof assessEpisodeBridge>[0]) =>
  render(
    <EpisodeBridgeCard
      assessment={assessEpisodeBridge(samples, NOW)}
      evaluatedAt={NOW}
      isLoading={false}
      onRefresh={vi.fn()}
    />
  );

describe('cartão da ponte de episódios', () => {
  it('nunca apresenta ignorância como saúde', () => {
    renderCard([at(10, 40)]);
    expect(screen.getByText('sem leitura suficiente')).toBeInTheDocument();
    expect(screen.queryByText('em dia')).not.toBeInTheDocument();
    // Sem veredito não há números a exibir — travessão, não zero.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('não sinaliza severidade enquanto a fila drena', () => {
    renderCard([at(70, 80), at(40, 60), at(1, 40)]);
    expect(screen.getByText('drenando')).toBeInTheDocument();
    expect(screen.queryByText('crítico')).not.toBeInTheDocument();
    expect(screen.queryByText('atenção')).not.toBeInTheDocument();
  });

  it('marca a ponte travada como crítica e mostra a variação', () => {
    renderCard([at(70, 5), at(40, 20), at(1, 40)]);
    expect(screen.getByText('travada')).toBeInTheDocument();
    expect(screen.getByText('crítico')).toBeInTheDocument();
    expect(screen.getByText('+35')).toBeInTheDocument();
  });

  it('exibe atenção para crescimento moderado', () => {
    renderCard([at(70, 4), at(40, 7), at(1, 10)]);
    expect(screen.getByText('crescendo')).toBeInTheDocument();
    expect(screen.getByText('atenção')).toBeInTheDocument();
  });

  it('mostra a fila zerada como em dia', () => {
    renderCard([at(70, 0), at(40, 0), at(1, 0)]);
    expect(screen.getByText('em dia')).toBeInTheDocument();
    expect(screen.getByText('estável')).toBeInTheDocument();
  });
});
