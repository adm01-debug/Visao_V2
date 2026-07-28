import { describe, expect, it } from 'vitest';

import {
  ABSOLUTE_CRITICAL_FLOOR,
  TREND_WINDOW_HOURS,
  assessEpisodeBridge,
} from '../episodeBridgeWatch';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);
const at = (hoursAgo: number, abandonedOpen: number) => ({
  executedAt: NOW - hoursAgo * HOUR,
  abandonedOpen,
});

describe('vigia da ponte de episódios', () => {
  it('declara ignorância em vez de saúde quando há poucas execuções', () => {
    const a = assessEpisodeBridge([at(10, 40), at(2, 90)], NOW);
    expect(a.verdict).toBe('insufficient_data');
    expect(a.severity).toBeNull();
  });

  it('não alarma quando a fila está drenando', () => {
    const a = assessEpisodeBridge([at(70, 80), at(40, 60), at(1, 40)], NOW);
    expect(a.verdict).toBe('draining');
    expect(a.severity).toBeNull();
  });

  it('trata patamar absoluto como crítico mesmo estável ou drenando', () => {
    const a = assessEpisodeBridge(
      [at(70, ABSOLUTE_CRITICAL_FLOOR + 5), at(40, ABSOLUTE_CRITICAL_FLOOR + 2), at(1, ABSOLUTE_CRITICAL_FLOOR)],
      NOW,
    );
    expect(a.verdict).toBe('stuck');
    expect(a.severity).toBe('critical');
  });

  it('separa crescimento de atenção de crescimento travado', () => {
    expect(assessEpisodeBridge([at(70, 4), at(40, 7), at(1, 10)], NOW).severity).toBe('warning');
    expect(assessEpisodeBridge([at(70, 5), at(40, 20), at(1, 40)], NOW).severity).toBe('critical');
  });

  it('tolera oscilação abaixo do piso de ruído', () => {
    const a = assessEpisodeBridge([at(70, 0), at(40, 1), at(1, 2)], NOW);
    expect(a.verdict).toBe('tolerated');
    expect(a.severity).toBeNull();
  });

  it('descarta leitura com carimbo no futuro em vez de usá-la como base', () => {
    const limpo = assessEpisodeBridge([at(70, 4), at(40, 7), at(1, 10)], NOW);
    const sujo = assessEpisodeBridge([at(-5, 0), at(70, 4), at(40, 7), at(1, 10)], NOW);
    expect(sujo.baseline).toBe(limpo.baseline);
    expect(sujo.verdict).toBe(limpo.verdict);
  });

  it('ignora execuções fora da janela de tendência', () => {
    const a = assessEpisodeBridge(
      [at(TREND_WINDOW_HOURS + 10, 1), at(70, 4), at(40, 7), at(1, 10)],
      NOW,
    );
    expect(a.samples).toBe(3);
    expect(a.baseline).toBe(4);
  });

  it('não depende da ordem em que as leituras chegam', () => {
    const rows = [at(1, 10), at(70, 4), at(40, 7)];
    expect(assessEpisodeBridge(rows, NOW).verdict).toBe('growing');
  });
});
