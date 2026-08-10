import { describe, it, expect } from 'vitest';
import { detectFromBuffer, detectFromOnvifProbe, mergeMatches } from '../firmwareDetector';

function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

describe('firmwareDetector — detectFromBuffer', () => {
  it('identifica firmware XiongMai/Sofia (NBD80X) com alta pontuação', () => {
    const buf = concat(
      new Uint8Array(64),
      ascii('Sofia System v1.0'),
      new Uint8Array(32),
      ascii('HZXM NBD80X08S-QWG-V3 dvrsvr XMEYE')
    );
    const matches = detectFromBuffer(buf);
    expect(matches.length).toBeGreaterThan(0);
    const top = matches[0];
    expect(top.brandId).toBe('xiongmai');
    expect(top.profileId).toBe('xiongmai-nbd80x');
    expect(top.score).toBeGreaterThan(0.6);
    expect(top.evidence.some((e) => e.value.includes('Sofia'))).toBe(true);
  });

  it('identifica firmware Hikvision por strings ISAPI', () => {
    const buf = ascii('bootloader v2 hikvision davinci ISAPI/Streaming/Channels ok');
    const matches = detectFromBuffer(buf);
    expect(matches[0]?.brandId).toBe('hikvision');
  });

  it('identifica firmware Dahua (DVRIPweb)', () => {
    const buf = ascii('General.dh header DVRIPweb dahua build');
    const matches = detectFromBuffer(buf);
    expect(matches[0]?.brandId).toBe('dahua');
  });

  it('retorna vazio para binário sem assinaturas conhecidas', () => {
    const buf = new Uint8Array(1024);
    expect(detectFromBuffer(buf)).toEqual([]);
  });
});

describe('firmwareDetector — detectFromOnvifProbe', () => {
  it('resolve XiongMai a partir de HardwareId NBD80X*', () => {
    const matches = detectFromOnvifProbe({ hardwareId: 'NBD80X08S-QWG-V3' });
    expect(matches[0]?.brandId).toBe('xiongmai');
    expect(matches[0]?.profileId).toBe('xiongmai-nbd80x');
    expect(matches[0]?.evidence.some((e) => e.kind === 'onvif')).toBe(true);
  });

  it('resolve XiongMai a partir de Manufacturer=XM', () => {
    const matches = detectFromOnvifProbe({ manufacturer: 'XM', model: 'generic' });
    expect(matches[0]?.brandId).toBe('xiongmai');
  });

  it("fallback textual: Manufacturer contendo 'Hikvision'", () => {
    const matches = detectFromOnvifProbe({ manufacturer: 'Hikvision Digital Tech' });
    expect(matches[0]?.brandId).toBe('hikvision');
  });
});

describe('firmwareDetector — mergeMatches', () => {
  it('soma evidências do mesmo brand e limita em 1.0', () => {
    const firmware = detectFromBuffer(ascii('Sofia HZXM XMEYE dvrsvr NBD80X'));
    const onvif = detectFromOnvifProbe({ hardwareId: 'NBD80X08S-QWG-V3', manufacturer: 'XM' });
    const merged = mergeMatches(firmware, onvif);
    expect(merged[0].brandId).toBe('xiongmai');
    expect(merged[0].score).toBeLessThanOrEqual(1);
    // Evidências vieram de ambas as fontes.
    expect(merged[0].evidence.some((e) => e.kind === 'string')).toBe(true);
    expect(merged[0].evidence.some((e) => e.kind === 'onvif')).toBe(true);
  });

  it('preserva profileId quando um dos lados o trouxer', () => {
    const a = detectFromBuffer(ascii('hikvision ISAPI')); // sem profileId
    const b = detectFromOnvifProbe({ hardwareId: 'NBD80X08S-QWG-V3' });
    const merged = mergeMatches(a, b);
    // Dois brands diferentes → dois grupos.
    expect(merged.length).toBeGreaterThanOrEqual(2);
    const xm = merged.find((m) => m.brandId === 'xiongmai');
    expect(xm?.profileId).toBe('xiongmai-nbd80x');
  });
});
