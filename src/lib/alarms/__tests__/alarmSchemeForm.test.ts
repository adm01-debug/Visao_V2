/**
 * Onda 218 — Pré-validação do formulário (leis F1..F6).
 */

import { describe, it, expect } from 'vitest';
import {
  admitSchemeSubmission,
  draftToForm,
  draftToPayload,
  emptyFormState,
  formToDraft,
  parseIdList,
  storedChannelTotal,
  type AlarmSchemeFormState,
} from '@/lib/alarms/alarmSchemeForm';

const base = (over: Partial<AlarmSchemeFormState> = {}): AlarmSchemeFormState => ({
  ...emptyFormState(),
  name: 'Cerca — doca',
  eventType: 'intrusion',
  sources: 'cam-01',
  actions: [
    {
      id: 'a1',
      kind: 'display_live',
      displayChannels: 'cam-01',
      recordChannels: '',
      missingChannels: '',
    },
  ],
  ...over,
});

describe('parseIdList', () => {
  it('aceita vírgula, ponto-e-vírgula e quebra de linha, deduplicando', () => {
    expect(parseIdList('a, b;c\nb ')).toEqual(['a', 'b', 'c']);
  });
  it('F5 — entrada hostil não lança', () => {
    expect(parseIdList(undefined)).toEqual([]);
    expect(parseIdList(42)).toEqual([]);
  });
});

describe('admitSchemeSubmission', () => {
  it('admite cadastro completo', () => {
    const a = admitSchemeSubmission(base());
    expect(a.allowed).toBe(true);
    expect(a.diagnosis.health).toBe('ok');
  });

  it('F1 — nome vazio bloqueia (espelho do CHECK)', () => {
    const a = admitSchemeSubmission(base({ name: '   ' }));
    expect(a.allowed).toBe(false);
    expect(a.blocking.some((i) => i.code === 'name_missing')).toBe(true);
  });

  it('F1 — tipo fora do catálogo bloqueia', () => {
    const a = admitSchemeSubmission(base({ eventType: 'nao_existe' }));
    expect(a.allowed).toBe(false);
  });

  it('F1 — esquema sem ação bloqueia (cobertura falsa)', () => {
    const a = admitSchemeSubmission(base({ actions: [] }));
    expect(a.allowed).toBe(false);
    expect(a.blocking.some((i) => i.code === 'no_actions')).toBe(true);
  });

  it('F1 — face_recognized sem biblioteca bloqueia; com uma, libera', () => {
    expect(admitSchemeSubmission(base({ eventType: 'face_recognized' })).allowed).toBe(false);
    const ok = admitSchemeSubmission(
      base({ eventType: 'face_recognized', faceLibraries: 'lib-1' })
    );
    expect(ok.allowed).toBe(true);
  });

  it('F2 — origem parcialmente removida avisa mas não bloqueia', () => {
    const a = admitSchemeSubmission(base({ sources: 'cam-01, cam-02', missingSources: 'cam-02' }));
    expect(a.allowed).toBe(true);
    expect(a.degrading.some((i) => i.code === 'sources_partially_missing')).toBe(true);
  });

  it('F3 — conta como o banco: canais removidos também estouram o teto', () => {
    const many = Array.from({ length: 40 }, (_, i) => `cam-${i}`).join(',');
    const a = admitSchemeSubmission(
      base({
        actions: [
          {
            id: 'a1',
            kind: 'record',
            displayChannels: '',
            recordChannels: many,
            // Todos removidos: o diagnóstico descartaria, o banco conta assim mesmo.
            missingChannels: many,
          },
          {
            id: 'a2',
            kind: 'display_live',
            displayChannels: 'cam-01',
            recordChannels: '',
            missingChannels: '',
          },
        ],
      })
    );
    expect(a.storedTotal).toBe(41);
    expect(a.allowed).toBe(false);
    expect(a.refusals.some((r) => r.code === 'stored_channel_budget_exceeded')).toBe(true);
  });

  it('F3 — a fronteira 36 é aceita e 37 recusada', () => {
    const list = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`).join(',');
    const at36 = admitSchemeSubmission(
      base({
        actions: [
          {
            id: 'a1',
            kind: 'display_live',
            displayChannels: list(36),
            recordChannels: '',
            missingChannels: '',
          },
        ],
      })
    );
    expect(at36.storedTotal).toBe(36);
    expect(at36.refusals.some((r) => r.code === 'stored_channel_budget_exceeded')).toBe(false);

    const at37 = admitSchemeSubmission(
      base({
        actions: [
          {
            id: 'a1',
            kind: 'display_live',
            displayChannels: list(37),
            recordChannels: '',
            missingChannels: '',
          },
        ],
      })
    );
    expect(at37.storedTotal).toBe(37);
    expect(at37.allowed).toBe(false);
  });

  it('F5 — limiar não numérico não lança e vira achado, não crash', () => {
    const a = admitSchemeSubmission(
      base({ eventType: 'device_disconnected', disconnectThresholdS: 'abc' })
    );
    expect(a.diagnosis.disconnectThresholdS).toBe(180);
    expect(a.allowed).toBe(true);
  });
});

describe('payload', () => {
  it('F6 — limiar só é persistido em device_disconnected', () => {
    const other = draftToPayload(formToDraft(base({ disconnectThresholdS: '300' })));
    expect(other.disconnect_threshold_s).toBeNull();

    const disc = draftToPayload(
      formToDraft(base({ eventType: 'device_disconnected', disconnectThresholdS: '300' }))
    );
    expect(disc.disconnect_threshold_s).toBe(300);
  });

  it('F4 — payload e diagnóstico saem do mesmo rascunho', () => {
    const form = base({ sources: 'cam-01, cam-02' });
    const draft = formToDraft(form);
    const payload = draftToPayload(draft);
    expect(payload.source_ids).toEqual(draft.sourceIds);
    expect(storedChannelTotal(draft)).toBe(1);
  });

  it('reidrata o formulário sem perder informação', () => {
    const draft = formToDraft(base({ sources: 'cam-01, cam-02', missingSources: 'cam-02' }));
    const round = formToDraft(draftToForm(draft));
    expect(round.sourceIds).toEqual(draft.sourceIds);
    expect(round.missingSourceIds).toEqual(draft.missingSourceIds);
  });
});
