import { describe, expect, it } from 'vitest';
import {
  DWELL_POLICY,
  VEHICLE_RECURRENCE_POLICY,
  applyDwellObservation,
  countPlatePasses,
  dwellSeconds,
  normalizePlate,
  secondsUntilDwellAlert,
  shouldAlertDwell,
  type DwellSessionState,
} from '@/lib/analytics/dwellTracker';

const T0 = Date.UTC(2026, 6, 26, 12, 0, 0);
const at = (seconds: number) => T0 + seconds * 1000;

const open = (seconds: number, detections = 1): DwellSessionState => ({
  startedAt: T0,
  lastSeenAt: at(seconds),
  detections,
  peakConfidence: 0.9,
});

describe('applyDwellObservation', () => {
  it('rejeita alvo sem identificador', () => {
    const d = applyDwellObservation(null, { trackKey: '   ', confidence: 0.9, observedAt: T0 });
    expect(d).toEqual({ ok: false, reason: 'missing_track_key' });
  });

  it('rejeita detecção abaixo da confiança mínima', () => {
    const d = applyDwellObservation(null, { trackKey: 'a', confidence: 0.44, observedAt: T0 });
    expect(d).toEqual({ ok: false, reason: 'low_confidence' });
  });

  it('aceita exatamente no piso de confiança', () => {
    const d = applyDwellObservation(null, {
      trackKey: 'a',
      confidence: DWELL_POLICY.minConfidence,
      observedAt: T0,
    });
    expect(d.ok && d.action).toBe('opened');
  });

  it('estende dentro da folga e acumula detecções e pico', () => {
    const d = applyDwellObservation(
      { startedAt: T0, lastSeenAt: T0, detections: 1, peakConfidence: 0.5 },
      { trackKey: 'a', confidence: 0.8, observedAt: at(DWELL_POLICY.gapSeconds) }
    );
    expect(d.ok && d.action).toBe('extended');
    expect(d.ok && d.session.detections).toBe(2);
    expect(d.ok && d.session.peakConfidence).toBe(0.8);
    expect(d.ok && d.session.startedAt).toBe(T0);
  });

  it('abre nova sessão um segundo além da folga', () => {
    const d = applyDwellObservation(open(0), {
      trackKey: 'a',
      confidence: 0.9,
      observedAt: at(DWELL_POLICY.gapSeconds + 1),
    });
    expect(d.ok && d.action).toBe('opened');
    expect(d.ok && d.session.detections).toBe(1);
  });

  it('ignora observação fora de ordem sem encolher a janela', () => {
    const session = open(100, 4);
    const d = applyDwellObservation(session, {
      trackKey: 'a',
      confidence: 0.9,
      observedAt: at(50),
    });
    expect(d.ok && d.action).toBe('ignored_out_of_order');
    expect(d.ok && d.session).toEqual(session);
  });

  it('corta a sessão no teto duro mesmo com presença contínua', () => {
    const long: DwellSessionState = {
      startedAt: T0,
      lastSeenAt: at(DWELL_POLICY.maxOpenSeconds),
      detections: 500,
      peakConfidence: 1,
    };
    const d = applyDwellObservation(long, {
      trackKey: 'a',
      confidence: 0.9,
      observedAt: at(DWELL_POLICY.maxOpenSeconds + 10),
    });
    expect(d.ok && d.action).toBe('opened');
  });
});

describe('limiar de alerta de permanência', () => {
  it('exige detecções suficientes', () => {
    expect(shouldAlertDwell(open(300, DWELL_POLICY.minDetections - 1))).toBe(false);
    expect(shouldAlertDwell(open(300, DWELL_POLICY.minDetections))).toBe(true);
  });

  it('nunca aceita limite abaixo do piso da política', () => {
    expect(shouldAlertDwell(open(10, 9), 1)).toBe(false);
    expect(secondsUntilDwellAlert(open(10, 9), 1)).toBe(DWELL_POLICY.minDwellSeconds - 10);
  });

  it('conta a duração como janela fechada em segundos', () => {
    expect(dwellSeconds(open(90))).toBe(90);
    expect(secondsUntilDwellAlert(open(90, 5))).toBe(0);
  });
});

describe('countPlatePasses', () => {
  const now = at(0);
  const read = (plate: string, minutesAgo: number, confidence = 0.9, cameraId = 'cam-1') => ({
    plate,
    confidence,
    seenAt: now - minutesAgo * 60_000,
    cameraId,
  });

  it('colapsa releituras da mesma passagem', () => {
    const [r] = countPlatePasses(
      [
        read('ABC1D23', 30),
        { ...read('ABC1D23', 30), seenAt: now - 30 * 60_000 + 10_000 },
        read('ABC1D23', 20),
        read('ABC1D23', 10),
      ],
      now
    );
    expect(r?.passes).toBe(3);
    expect(r?.recurrent).toBe(true);
  });

  it('normaliza caixa e espaços da placa', () => {
    const rows = countPlatePasses([read(' abc1d23 ', 30), read('ABC1D23', 20)], now);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.plate).toBe('ABC1D23');
    expect(normalizePlate(' xyz ')).toBe('XYZ');
  });

  it('descarta leituras de baixa confiança', () => {
    const rows = countPlatePasses([read('LOW1234', 30, 0.2), read('LOW1234', 20, 0.2)], now);
    expect(rows).toHaveLength(0);
  });

  it('descarta leituras fora da janela', () => {
    const rows = countPlatePasses(
      [read('OLD1234', VEHICLE_RECURRENCE_POLICY.windowMinutes + 1), read('OLD1234', 5)],
      now
    );
    expect(rows[0]?.passes).toBe(1);
    expect(rows[0]?.recurrent).toBe(false);
  });

  it('descarta placas curtas demais para serem placa', () => {
    expect(countPlatePasses([read('AB1', 5), read('AB1', 2)], now)).toHaveLength(0);
  });

  it('conta câmeras distintas da mesma placa', () => {
    const [r] = countPlatePasses(
      [
        read('MUL1T23', 30, 0.9, 'cam-1'),
        read('MUL1T23', 20, 0.9, 'cam-2'),
        read('MUL1T23', 10, 0.9, 'cam-2'),
      ],
      now
    );
    expect(r?.cameras).toBe(2);
    expect(r?.passes).toBe(3);
  });

  it('respeita min_passes customizado', () => {
    const rows = countPlatePasses([read('TWO1P23', 30), read('TWO1P23', 20)], now, {
      minPasses: 2,
    });
    expect(rows[0]?.recurrent).toBe(true);
  });

  it('ordena por número de passagens', () => {
    const rows = countPlatePasses(
      [read('AAA1A11', 30), read('AAA1A11', 20), read('AAA1A11', 10), read('BBB2B22', 5)],
      now
    );
    expect(rows.map((r) => r.plate)).toEqual(['AAA1A11', 'BBB2B22']);
  });

  it('reporta a última leitura da placa', () => {
    const [r] = countPlatePasses([read('LST1234', 30), read('LST1234', 10)], now);
    expect(r?.lastSeenAt).toBe(now - 10 * 60_000);
  });
});

describe('paridade de políticas', () => {
  it('mantém os números que o gate de CI compara com o banco', () => {
    expect(DWELL_POLICY).toEqual({
      gapSeconds: 30,
      minDwellSeconds: 60,
      maxOpenSeconds: 21_600,
      minDetections: 3,
      minConfidence: 0.45,
      alertCooldownSeconds: 900,
    });
    expect(VEHICLE_RECURRENCE_POLICY).toEqual({
      windowMinutes: 180,
      minPasses: 3,
      samePassSeconds: 120,
      alertCooldownMinutes: 180,
      minConfidence: 0.6,
    });
  });
});
