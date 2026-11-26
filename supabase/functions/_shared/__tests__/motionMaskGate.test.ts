import { assertEquals, assertAlmostEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  applyMotionMaskGate,
  bboxCenter,
  type MotionMaskBox,
  type MotionMaskDeps,
} from '../motionMaskGate.ts';

function makeDeps(opts: {
  count?: number | null;
  countError?: string;
  trigger?: (x: number, y: number) => boolean | null;
  triggerError?: string;
}): MotionMaskDeps & { warns: string[] } {
  const warns: string[] = [];
  return {
    warns,
    countEnabledMasks: async () => ({ count: opts.count ?? 0, error: opts.countError ?? null }),
    pointTriggersMotion: async (x, y) => ({
      value: opts.trigger ? opts.trigger(x, y) : true,
      error: opts.triggerError ?? null,
    }),
    warn: (message) => warns.push(message),
  };
}

const det = (x: number, y: number) => ({
  label: 'person',
  bbox: { x, y, width: 0.1, height: 0.1 },
});

Deno.test('bboxCenter: calcula o centro do bbox', () => {
  const c = bboxCenter({ x: 0.2, y: 0.4, width: 0.2, height: 0.1 });
  assertAlmostEquals(c!.x, 0.3, 1e-9);
  assertAlmostEquals(c!.y, 0.45, 1e-9);
});

Deno.test('bboxCenter: bbox ausente ou invalido devolve null', () => {
  assertEquals(bboxCenter(undefined), null);
  assertEquals(bboxCenter(null), null);
  assertEquals(bboxCenter({ x: Number.NaN, y: 0, width: 0.1, height: 0.1 }), null);
});

Deno.test('sem mascara habilitada: nada e descartado', async () => {
  const deps = makeDeps({ count: 0 });
  const res = await applyMotionMaskGate(deps, [det(0.1, 0.1), det(0.5, 0.5)]);
  assertEquals(res.kept.length, 2);
  assertEquals(res.removed, 0);
  assertEquals(res.degraded, false);
  assertEquals(deps.warns.length, 0);
});

Deno.test('lista vazia de deteccoes nao consulta o banco', async () => {
  let called = false;
  const deps: MotionMaskDeps = {
    countEnabledMasks: async () => {
      called = true;
      return { count: 3 };
    },
    pointTriggersMotion: async () => ({ value: true }),
    warn: () => {},
  };
  const res = await applyMotionMaskGate(deps, []);
  assertEquals(res.kept.length, 0);
  assertEquals(called, false);
});

Deno.test('com mascara: mantem quem dispara e descarta quem nao dispara', async () => {
  // include mask cobrindo só a metade esquerda da imagem
  const deps = makeDeps({ count: 1, trigger: (x) => x < 0.5 });
  const dentro = det(0.05, 0.05); // centro 0.1 → dispara
  const fora = det(0.6, 0.05); // centro 0.65 → não dispara
  const res = await applyMotionMaskGate(deps, [dentro, fora]);
  assertEquals(res.kept, [dentro]);
  assertEquals(res.removed, 1);
  assertEquals(res.degraded, false);
});

Deno.test('deteccao sem bbox e preservada mesmo com mascara', async () => {
  const deps = makeDeps({ count: 1, trigger: () => false });
  const semBbox: { label: string; bbox?: MotionMaskBox | null } = { label: 'person' };
  const res = await applyMotionMaskGate(deps, [semBbox]);
  assertEquals(res.kept, [semBbox]);
  assertEquals(res.removed, 0);
});

Deno.test('erro ao consultar mascaras: fail-open e degradado', async () => {
  const deps = makeDeps({ count: null, countError: 'timeout' });
  const res = await applyMotionMaskGate(deps, [det(0.1, 0.1)]);
  assertEquals(res.kept.length, 1);
  assertEquals(res.degraded, true);
  assertEquals(deps.warns, ['motion_masks lookup failed']);
});

Deno.test('erro na RPC point_triggers_motion: fail-open e degradado', async () => {
  const deps = makeDeps({ count: 2, trigger: () => null, triggerError: 'rpc falhou' });
  const res = await applyMotionMaskGate(deps, [det(0.1, 0.1), det(0.6, 0.6)]);
  assertEquals(res.kept.length, 2);
  assertEquals(res.removed, 0);
  assertEquals(res.degraded, true);
  assertEquals(deps.warns.length, 2);
});
