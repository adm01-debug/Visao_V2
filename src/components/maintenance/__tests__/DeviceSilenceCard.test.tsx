import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeviceSilenceCard } from '@/components/maintenance/DeviceSilenceCard';
import {
  classifyDeviceSilence,
  summarizeDeviceSilence,
  type DeviceSilenceSnapshot,
} from '@/lib/devices/deviceSilence';

const NOW = Date.parse('2026-07-28T12:00:00Z');
const MIN = 60_000;

const snap = (over: Partial<DeviceSilenceSnapshot> & { deviceCode: string }): DeviceSilenceSnapshot => ({
  registrationId: over.deviceCode,
  label: 'Gravador',
  status: 'active',
  lastSeenAt: NOW - 2 * MIN,
  lastDeniedAt: null,
  expiresAt: null,
  rotatedAt: null,
  createdAt: NOW - 30 * 24 * 60 * MIN,
  ...over,
});

const build = (snapshots: DeviceSilenceSnapshot[]) => {
  const verdicts = snapshots.map((s) => classifyDeviceSilence(s, NOW));
  return { verdicts, summary: summarizeDeviceSilence(verdicts) };
};

const renderCard = (snapshots: DeviceSilenceSnapshot[]) => {
  const { verdicts, summary } = build(snapshots);
  render(
    <DeviceSilenceCard
      verdicts={verdicts}
      summary={summary}
      evaluatedAt={NOW}
      isLoading={false}
      onRefresh={() => undefined}
    />,
  );
};

describe('DeviceSilenceCard', () => {
  it('separa quem está recusado de quem sumiu', () => {
    renderCard([
      snap({ deviceCode: 'AAAAAAAA0001', lastSeenAt: NOW - 600 * MIN }),
      snap({ deviceCode: 'AAAAAAAA0002', lastSeenAt: NOW - 700 * MIN, lastDeniedAt: NOW - 2 * MIN }),
    ]);
    expect(screen.getByText('chegando e recusado')).toBeInTheDocument();
    expect(screen.getByText('sem se apresentar')).toBeInTheDocument();
    expect(screen.getByText(/verifique o segredo de registro/)).toBeInTheDocument();
  });

  it('silêncio intencional aparece como fato, nunca como incidente', () => {
    renderCard([
      snap({ deviceCode: 'AAAAAAAA0003', status: 'revoked', lastSeenAt: NOW - 9000 * MIN }),
      snap({ deviceCode: 'AAAAAAAA0004', lastSeenAt: null, expiresAt: NOW + 60 * MIN }),
    ]);
    expect(screen.getByText('silêncio esperado')).toBeInTheDocument();
    expect(screen.getByText('aguardando 1ª conexão')).toBeInTheDocument();
    expect(screen.getByText('Nenhum equipamento exigindo atenção agora.')).toBeInTheDocument();
  });

  it('nunca rotula ausência de dados como saúde', () => {
    renderCard([]);
    expect(screen.getByText('Nenhum equipamento registrado ainda.')).toBeInTheDocument();
    expect(screen.queryByText('em dia')).not.toBeInTheDocument();
  });

  it('mostra o contador de acionáveis sem inflar com silêncio esperado', () => {
    const { summary } = build([
      snap({ deviceCode: 'AAAAAAAA0005', lastSeenAt: NOW - 600 * MIN }),
      snap({ deviceCode: 'AAAAAAAA0006', status: 'revoked', lastSeenAt: NOW - 600 * MIN }),
      snap({ deviceCode: 'AAAAAAAA0007' }),
    ]);
    expect(summary.actionable).toBe(1);
    expect(summary.quiet).toBe(1);
    expect(summary.ok).toBe(1);
  });
});
