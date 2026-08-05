import { describe, expect, it } from 'vitest';
import { admitEvent, admissionReasonLabel, type AdmissionScheme } from '../eventAdmission';
import type { AlarmSchedule } from '../alarmAggregation';

const WINDOW_MON_8_10: AlarmSchedule = [[], [{ startMin: 480, endMin: 600 }], [], [], [], [], []];
const monday = (h: number, m = 0) => Date.UTC(2026, 6, 27, h, m);

const scheme = (over: Partial<AdmissionScheme> = {}): AdmissionScheme => ({
  id: 'esquema-1',
  eventType: 'intrusion',
  enabled: true,
  health: 'ok',
  schedule: WINDOW_MON_8_10,
  sourceIds: ['cam-a'],
  missingSourceIds: [],
  ...over,
});

const event = (over: Partial<Parameters<typeof admitEvent>[1]> = {}) => ({
  sourceId: 'cam-a',
  eventType: 'intrusion',
  at: monday(9),
  tzOffsetMinutes: 0,
  ...over,
});

describe('admitEvent', () => {
  it('admite dentro da janela declarada', () => {
    const v = admitEvent([scheme()], event());
    expect(v.admitted).toBe(true);
    expect(v.reason).toBe('admitted');
    expect(v.admittingSchemeIds).toEqual(['esquema-1']);
  });

  it('recusa fora da janela informando o motivo exato', () => {
    const v = admitEvent([scheme()], event({ at: monday(10) }));
    expect(v.admitted).toBe(false);
    expect(v.reason).toBe('out_of_window');
  });

  it('E1 — evento que ninguém vigia é recusa neutra', () => {
    expect(admitEvent([], event()).reason).toBe('no_scheme');
    expect(admitEvent([scheme()], event({ eventType: 'tampering' })).reason).toBe('no_scheme');
    expect(admitEvent([scheme()], event({ sourceId: 'cam-z' })).reason).toBe('no_scheme');
  });

  it('E3 — origem marcada como ausente não escuta, mas fica registrada', () => {
    const v = admitEvent([scheme({ missingSourceIds: ['cam-a'] })], event());
    expect(v.admitted).toBe(false);
    expect(v.reason).toBe('source_missing');
    expect(v.missingSourceSchemeIds).toEqual(['esquema-1']);
  });

  it('N2 — esquema inoperante nunca admite', () => {
    expect(admitEvent([scheme({ health: 'inoperative' })], event()).admitted).toBe(false);
  });

  it('N3 — degradado dentro da janela admite com ressalva declarada', () => {
    const v = admitEvent([scheme({ health: 'inconsistent' })], event());
    expect(v.admitted).toBe(true);
    expect(v.reason).toBe('admitted_degraded');
  });

  it('E5 — relógio indeterminado não admite e não acusa "fora da janela"', () => {
    const v = admitEvent([scheme()], event({ at: null }));
    expect(v.admitted).toBe(false);
    expect(v.reason).toBe('indeterminate');
  });

  it('E6 — basta um esquema armado, e a ressalva alheia não contamina', () => {
    const v = admitEvent(
      [scheme({ id: 'a', health: 'inconsistent' }), scheme({ id: 'b' })],
      event()
    );
    expect(v.reason).toBe('admitted');
    expect(v.admittingSchemeIds).toEqual(['a', 'b']);
  });

  it('E6 — na recusa vence o motivo mais acionável', () => {
    const v = admitEvent(
      [scheme({ id: 'a', enabled: false }), scheme({ id: 'b' })],
      event({ at: monday(10) })
    );
    expect(v.reason).toBe('out_of_window');
  });

  it('E7 — a ordem dos vereditos acompanha a ordem de entrada', () => {
    const v = admitEvent([scheme({ id: 'z' }), scheme({ id: 'a' })], event());
    expect(v.perScheme.map((p) => p.schemeId)).toEqual(['z', 'a']);
  });

  it('E8 — o fuso informado desloca a janela', () => {
    expect(admitEvent([scheme()], event({ at: monday(11), tzOffsetMinutes: -120 })).admitted).toBe(
      true
    );
  });

  it('agenda ausente é 24×7', () => {
    expect(admitEvent([scheme({ schedule: null })], event({ at: monday(3) })).admitted).toBe(true);
  });

  it('todo motivo tem rótulo legível', () => {
    expect(admissionReasonLabel('out_of_window')).toMatch(/janela/i);
    expect(admissionReasonLabel('indeterminate')).toMatch(/indeterminado/i);
  });
});
