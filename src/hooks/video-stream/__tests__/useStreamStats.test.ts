/**
 * Regress?o ? bitrate adaptativo em useStreamStats.
 *
 * Comportamento observ?vel: degrada o n?vel via autoLevelCapping quando o buffer
 * fica baixo por amostras consecutivas (somente em modo autom?tico), recupera o
 * modo auto ap?s buffer est?vel consecutivo, e ignora escolhas manuais.
 * N?o usa currentLevel (que descarta buffer) ? s? o teto do ABR do hls.js.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStreamStats } from '../useStreamStats';

type HlsMock = {
  levels: { height: number; bitrate: number }[];
  autoLevelCapping: number;
  currentLevel: number;
  bandwidthEstimate?: number;
  latency?: number;
};

type VideoMock = {
  currentTime: number;
  videoWidth: number;
  videoHeight: number;
  buffered: { length: number; end: (i: number) => number };
};

function makeHarness(opts?: {
  bufferEnd?: number;
  currentLevel?: number;
  currentTime?: number;
  videoWidth?: number;
  cap?: number;
}) {
  // buffered = end - currentTime(10). baixo:<1.2, meio:1.2..3, estavel:>=3
  const bufferEnd = opts?.bufferEnd ?? 10.8;
  const video: VideoMock = {
    currentTime: opts?.currentTime ?? 10,
    videoWidth: opts?.videoWidth ?? 1920,
    videoHeight: 1080,
    buffered: {
      length: 1,
      end: () => bufferEnd,
    },
  };
  const hls: HlsMock = {
    levels: [
      { height: 360, bitrate: 840 },
      { height: 720, bitrate: 2100 },
      { height: 1080, bitrate: 6200 },
    ], // ordem real do hls.js: bitrate crescente (indice maior = melhor)
    autoLevelCapping: opts?.cap ?? -1,
    currentLevel: opts?.currentLevel ?? -1,
    bandwidthEstimate: 2_000_000,
    latency: 0.5,
  };
  const updates: Record<string, unknown>[] = [];
  const videoRef = { current: video };
  const hlsRef = { current: hls };
  const connectionStartRef = { current: 0 };
  const { result } = renderHook(() =>
    useStreamStats({
      videoRef,
      hlsRef,
      connectionStartRef,
      reconnectAttempts: 0,
      isPlaying: false,
      updateState: (u) => updates.push(u),
    })
  );
  return {
    video,
    hls,
    updates,
    run: () => act(() => result.current.updateStats()),
    setBuffer: (end: number) => {
      video.buffered.end = () => end;
    },
  };
}

const qualityUpdates = (updates: Record<string, unknown>[]) =>
  updates.map((u) => u.currentQuality).filter((q) => q !== undefined);

describe('useStreamStats ? bitrate adaptativo (autoLevelCapping)', () => {
  it('degrada um n?vel ap?s 2 amostras consecutivas de buffer baixo, sem usar currentLevel', () => {
    const { hls, updates, run } = makeHarness({ bufferEnd: 10.8 });
    run();
    expect(hls.autoLevelCapping).toBe(-1); // 1 amostra n?o degrada
    run();
    expect(hls.autoLevelCapping).toBe(1); // 720p
    expect(qualityUpdates(updates)).toContain('720p');
    expect(hls.currentLevel).toBe(-1); // modo autom?tico preservado
  });

  it('amostra intermedi?ria quebra a sequ?ncia consecutiva de buffer baixo', () => {
    const seq = makeHarness({ bufferEnd: 10.8 });
    seq.run(); // baixo (1?)
    seq.setBuffer(11.5); // intermedi?ria (1.2..3) ? quebra a sequ?ncia
    seq.run();
    seq.setBuffer(10.8);
    seq.run(); // baixo (1? de novo)
    expect(seq.hls.autoLevelCapping).toBe(-1); // nunca atingiu 2 consecutivas
  });

  it('recupera o modo auto ap?s 2 amostras consecutivas com buffer est?vel', () => {
    const h = makeHarness({ cap: 2, bufferEnd: 13.5 });
    h.run();
    expect(h.hls.autoLevelCapping).toBe(2); // 1 amostra est?vel n?o recupera
    h.run();
    expect(h.hls.autoLevelCapping).toBe(-1); // recupera para auto
    expect(qualityUpdates(h.updates)).toContain('auto');
  });

  it('ignora a adapta??o quando o usu?rio escolheu qualidade manual (currentLevel != -1)', () => {
    const { hls, updates, run } = makeHarness({ bufferEnd: 10.8, currentLevel: 2 });
    run();
    run();
    run();
    expect(hls.autoLevelCapping).toBe(-1);
    expect(qualityUpdates(updates)).not.toContain('360p');
  });

  it('n?o degrada antes da fase inicial (currentTime <= 5) ou sem v?deo', () => {
    const { hls, run } = makeHarness({ bufferEnd: 10.8, currentTime: 3 });
    run();
    run();
    expect(hls.autoLevelCapping).toBe(-1);
    const noVideo = makeHarness({ bufferEnd: 10.8, videoWidth: 0 });
    noVideo.run();
    noVideo.run();
    expect(noVideo.hls.autoLevelCapping).toBe(-1);
  });
});
