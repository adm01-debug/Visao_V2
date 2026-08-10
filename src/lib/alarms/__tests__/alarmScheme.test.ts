import { describe, expect, it } from 'vitest';

import {
  admitDisconnect,
  detectDuplicatePairings,
  diagnoseScheme,
  DISCONNECT_THRESHOLD_DEFAULT_S,
  MAX_EVENT_CHANNELS,
  schemeSummary,
  type AlarmActionDraft,
  type AlarmSchemeDraft,
} from '@/lib/alarms/alarmScheme';

const action = (over: Partial<AlarmActionDraft> = {}): AlarmActionDraft => ({
  id: 'a1',
  kind: 'record',
  recordChannelIds: ['c1'],
  ...over,
});

const scheme = (over: Partial<AlarmSchemeDraft> = {}): AlarmSchemeDraft => ({
  id: 's1',
  name: 'Cerca noturna',
  enabled: true,
  eventType: 'intrusion',
  sourceIds: ['c1'],
  actions: [action()],
  ...over,
});

const codes = (draft: AlarmSchemeDraft) => diagnoseScheme(draft).issues.map((i) => i.code);

describe('alarmScheme — cadastro', () => {
  it('aprova um esquema completo', () => {
    const d = diagnoseScheme(scheme());
    expect(d.health).toBe('ok');
    expect(d.armed).toBe(true);
    expect(d.alwaysOn).toBe(true);
    expect(schemeSummary(d)).toBe('Operando');
  });

  it('S1/S2 recusa nome vazio e tipo fora do catálogo', () => {
    expect(codes(scheme({ name: '   ' }))).toContain('name_missing');
    expect(codes(scheme({ eventType: 'teletransporte' }))).toContain('unknown_event_type');
    expect(diagnoseScheme(scheme({ eventType: 'teletransporte' })).health).toBe('inoperative');
  });

  it('S3 degrada com origem parcial e inoperante sem nenhuma origem viva', () => {
    const partial = diagnoseScheme(scheme({ sourceIds: ['c1', 'c2'], missingSourceIds: ['c2'] }));
    expect(partial.health).toBe('inconsistent');
    expect(partial.effectiveSourceIds).toEqual(['c1']);
    expect(partial.armed).toBe(true);

    const dead = diagnoseScheme(scheme({ sourceIds: ['c1'], missingSourceIds: ['c1'] }));
    expect(dead.health).toBe('inoperative');
    expect(dead.armed).toBe(false);
  });

  it('S4 esquema sem ação viável é inoperante, nunca "ok e silencioso"', () => {
    expect(diagnoseScheme(scheme({ actions: [] })).health).toBe('inoperative');
    const dead = diagnoseScheme(
      scheme({ actions: [action({ recordChannelIds: ['c1'], missingChannelIds: ['c1'] })] })
    );
    expect(dead.health).toBe('inoperative');
    expect(dead.issues.map((i) => i.code)).toContain('all_actions_missing');
  });

  it('S4 aceita ações sem canal quando agem no servidor', () => {
    const d = diagnoseScheme(
      scheme({ actions: [action({ id: 'mail', kind: 'email', recordChannelIds: [] })] })
    );
    expect(d.health).toBe('ok');
    expect(d.effectiveActionIds).toEqual(['mail']);
  });

  it('S5 recusa ações excedentes nomeando-as, sem truncar em silêncio', () => {
    const big = (id: string, n: number) =>
      action({
        id,
        kind: 'display_live',
        displayChannelIds: Array.from({ length: n }, (_, i) => `${id}-${i}`),
      });
    const d = diagnoseScheme(scheme({ actions: [big('a', 30), big('b', 10), big('c', 4)] }));

    expect(d.budget.total).toBeLessThanOrEqual(MAX_EVENT_CHANNELS);
    expect(d.budget.refusedActionIds).toEqual(['b']);
    expect(d.effectiveActionIds).toEqual(['a', 'c']);
    expect(d.health).toBe('inconsistent');
  });

  it('S5 conta exibição e gravação separadamente para o mesmo canal', () => {
    const d = diagnoseScheme(
      scheme({ actions: [action({ displayChannelIds: ['c1'], recordChannelIds: ['c1'] })] })
    );
    expect(d.budget.total).toBe(2);
  });

  it('S6 exige exatamente uma biblioteca, e do dispositivo de origem', () => {
    const base = scheme({ eventType: 'face_recognized' });
    expect(codes(base)).toContain('face_library_missing');
    expect(codes({ ...base, faceLibraryIds: ['l1', 'l2'] })).toContain('face_library_ambiguous');

    const foreign = diagnoseScheme(
      { ...base, faceLibraryIds: ['l1'] },
      { faceLibraries: [{ libraryId: 'l1', deviceIds: ['outro'] }] }
    );
    expect(foreign.issues.map((i) => i.code)).toContain('face_library_foreign');

    const good = diagnoseScheme(
      { ...base, faceLibraryIds: ['l1'] },
      { faceLibraries: [{ libraryId: 'l1', deviceIds: ['c1'] }] }
    );
    expect(good.health).toBe('ok');
  });

  it('S8 declara truncamento e período inválido da agenda', () => {
    const day = Array.from({ length: 8 }, (_, i) => ({ startMin: i * 100, endMin: i * 100 + 10 }));
    const c = codes(scheme({ schedule: [day, [], [], [], [], [], []] }));
    expect(c).toContain('schedule_periods_truncated');

    const bad = codes(
      scheme({ schedule: [[{ startMin: -5, endMin: 90 }], [], [], [], [], [], []] })
    );
    expect(bad).toContain('schedule_period_invalid');
  });

  it('S9 desabilitado não apaga a inconsistência', () => {
    const d = diagnoseScheme(
      scheme({ enabled: false, sourceIds: ['c1', 'c2'], missingSourceIds: ['c2'] })
    );
    expect(d.health).toBe('inconsistent');
    expect(d.armed).toBe(false);
    expect(schemeSummary(d)).toBe('Desabilitado');
  });
});

describe('alarmScheme — duplicidade IA (S7)', () => {
  it('acusa canal coberto pelo par com e sem IA', () => {
    const plain = diagnoseScheme(
      scheme({ id: 'p', eventType: 'tripwire', sourceIds: ['c1', 'c2'] })
    );
    const ai = diagnoseScheme(
      scheme({ id: 'x', eventType: 'tripwire_ai', sourceIds: ['c2', 'c3'] })
    );
    const dup = detectDuplicatePairings([plain, ai]);
    expect(dup).toHaveLength(1);
    expect(dup[0]?.channelId).toBe('c2');
  });

  it('não acusa quando um dos dois está desarmado', () => {
    const plain = diagnoseScheme(scheme({ id: 'p', eventType: 'tripwire', enabled: false }));
    const ai = diagnoseScheme(scheme({ id: 'x', eventType: 'tripwire_ai' }));
    expect(detectDuplicatePairings([plain, ai])).toHaveLength(0);
  });

  it('não confunde tipos que não formam par', () => {
    const a = diagnoseScheme(scheme({ id: 'p', eventType: 'intrusion' }));
    const b = diagnoseScheme(scheme({ id: 'x', eventType: 'tripwire_ai' }));
    expect(detectDuplicatePairings([a, b])).toHaveLength(0);
  });
});

describe('alarmScheme — desconexão (S10)', () => {
  const disconnect = (over: Partial<AlarmSchemeDraft> = {}) =>
    diagnoseScheme(scheme({ eventType: 'device_disconnected', ...over }));

  it('aplica o padrão de 180s e recusa limiar fora da faixa', () => {
    expect(disconnect().disconnectThresholdS).toBe(DISCONNECT_THRESHOLD_DEFAULT_S);
    const out = disconnect({ disconnectThresholdS: 5 });
    expect(out.disconnectThresholdS).toBe(DISCONNECT_THRESHOLD_DEFAULT_S);
    expect(out.issues.map((i) => i.code)).toContain('disconnect_threshold_out_of_range');
  });

  it('nunca dispara por desconexão manual', () => {
    const d = disconnect();
    expect(admitDisconnect(d, { cause: 'manual', offlineForS: 99999 })).toEqual({
      admitted: false,
      reason: 'manual_disconnect',
    });
  });

  it('só admite acima do limiar', () => {
    const d = disconnect({ disconnectThresholdS: 60 });
    expect(admitDisconnect(d, { cause: 'network', offlineForS: 59 }).admitted).toBe(false);
    expect(admitDisconnect(d, { cause: 'network', offlineForS: 60 }).admitted).toBe(true);
  });
});
