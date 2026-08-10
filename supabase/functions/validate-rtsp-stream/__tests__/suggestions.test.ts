import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildSuggestions, computeScore } from '../suggestions.ts';

Deno.test('computeScore: perfeito', () => {
  assertEquals(computeScore({ ok: true, latencyAvg: 50, jitter: 10, lossPct: 0 }), 'ok');
});

Deno.test('computeScore: warn em latência 400ms', () => {
  assertEquals(computeScore({ ok: true, latencyAvg: 400, jitter: 10, lossPct: 0 }), 'warn');
});

Deno.test('computeScore: critical em falha', () => {
  assertEquals(computeScore({ ok: false, latencyAvg: 0, jitter: 0, lossPct: 100 }), 'critical');
});

Deno.test('suggestions: timeout gera crítica', () => {
  const out = buildSuggestions({
    ok: false,
    timeout: true,
    latencyAvg: 0,
    jitter: 0,
    lossPct: 100,
    hasSubstream: false,
    target: 'primary',
  });
  assertEquals(out[0].code, 'TIMEOUT');
  assertEquals(out[0].severity, 'critical');
});

Deno.test('suggestions: 401 gera AUTH_FAILED', () => {
  const out = buildSuggestions({
    ok: false,
    timeout: false,
    httpStatus: 401,
    latencyAvg: 0,
    jitter: 0,
    lossPct: 100,
    hasSubstream: false,
    target: 'primary',
  });
  assertEquals(out[0].code, 'AUTH_FAILED');
});

Deno.test('suggestions: HEVC dispara aviso', () => {
  const out = buildSuggestions({
    ok: true,
    timeout: false,
    latencyAvg: 50,
    jitter: 5,
    lossPct: 0,
    codec: 'H.265',
    hasSubstream: true,
    target: 'primary',
  });
  assertEquals(
    out.some((s) => s.code === 'CODEC_HEVC'),
    true
  );
});

Deno.test('suggestions: substream ausente + resolução alta', () => {
  const out = buildSuggestions({
    ok: true,
    timeout: false,
    latencyAvg: 50,
    jitter: 5,
    lossPct: 0,
    resolution: '3840x2160',
    hasSubstream: false,
    target: 'primary',
  });
  const codes = out.map((s) => s.code);
  assertEquals(codes.includes('SUBSTREAM_MISSING'), true);
  assertEquals(codes.includes('HIGH_RES_NO_SUBSTREAM'), true);
});

Deno.test('suggestions: tudo perfeito → ALL_GOOD', () => {
  const out = buildSuggestions({
    ok: true,
    timeout: false,
    latencyAvg: 50,
    jitter: 5,
    lossPct: 0,
    codec: 'H.264',
    resolution: '1280x720',
    fps: 25,
    fpsSource: 'framerate',
    resolutionSource: 'cliprect',
    hasSubstream: true,
    authMethod: 'digest',
    target: 'primary',
  });
  assertEquals(out[0].code, 'ALL_GOOD');
});

Deno.test('suggestions: fps alto (>30) gera FPS_HIGH', () => {
  const out = buildSuggestions({
    ok: true,
    timeout: false,
    latencyAvg: 50,
    jitter: 5,
    lossPct: 0,
    codec: 'H.264',
    resolution: '1920x1080',
    fps: 60,
    hasSubstream: true,
    target: 'primary',
  });
  assertEquals(
    out.some((s) => s.code === 'FPS_HIGH'),
    true
  );
});

Deno.test('suggestions: fps baixo (<10) gera FPS_LOW', () => {
  const out = buildSuggestions({
    ok: true,
    timeout: false,
    latencyAvg: 50,
    jitter: 5,
    lossPct: 0,
    fps: 5,
    hasSubstream: true,
    target: 'primary',
  });
  assertEquals(
    out.some((s) => s.code === 'FPS_LOW'),
    true
  );
});

Deno.test('suggestions: substream com fps>15 gera SUBSTREAM_FPS_HIGH', () => {
  const out = buildSuggestions({
    ok: true,
    timeout: false,
    latencyAvg: 50,
    jitter: 5,
    lossPct: 0,
    fps: 25,
    hasSubstream: true,
    target: 'substream',
  });
  assertEquals(
    out.some((s) => s.code === 'SUBSTREAM_FPS_HIGH'),
    true
  );
});

Deno.test('suggestions: fps ausente (null) gera FPS_UNKNOWN', () => {
  const out = buildSuggestions({
    ok: true,
    timeout: false,
    latencyAvg: 50,
    jitter: 5,
    lossPct: 0,
    fps: null,
    hasSubstream: true,
    target: 'primary',
  });
  assertEquals(
    out.some((s) => s.code === 'FPS_UNKNOWN'),
    true
  );
});
