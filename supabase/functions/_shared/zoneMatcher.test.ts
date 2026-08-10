import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  isBoxInZone,
  isPointInPolygon,
  matchesRuleZone,
  normalizeGeometry,
  fetchZonesById,
  type ZoneGeometry,
  type ZoneRow,
} from './zoneMatcher.ts';

// ─── Fixtures ────────────────────────────────────────────────────────────────
const squarePoints = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];
const polygon: ZoneRow = {
  id: 'z1',
  is_active: true,
  geometry: { shape: 'polygon', points: squarePoints },
};
const rectangle: ZoneRow = {
  id: 'z-rect',
  is_active: true,
  geometry: { shape: 'rectangle', points: squarePoints },
};
const circle: ZoneRow = {
  id: 'z2',
  is_active: true,
  geometry: { shape: 'circle', points: [], center: { x: 50, y: 50 }, radius: 10 },
};
const inactive: ZoneRow = { ...polygon, id: 'z3', is_active: false };
const zones = new Map<string, ZoneRow>([
  [polygon.id, polygon],
  [rectangle.id, rectangle],
  [circle.id, circle],
  [inactive.id, inactive],
]);

// ─── isPointInPolygon (unitários) ────────────────────────────────────────────
Deno.test('isPointInPolygon: ponto claramente interno', () => {
  assertEquals(isPointInPolygon({ x: 5, y: 5 }, squarePoints), true);
});

Deno.test('isPointInPolygon: ponto claramente externo', () => {
  assertEquals(isPointInPolygon({ x: 20, y: 20 }, squarePoints), false);
});

Deno.test('isPointInPolygon: polígono côncavo (formato L)', () => {
  const concave = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 10 },
    { x: 0, y: 10 },
  ];
  assertEquals(isPointInPolygon({ x: 2, y: 8 }, concave), true);
  assertEquals(isPointInPolygon({ x: 8, y: 8 }, concave), false);
});

Deno.test('isPointInPolygon: polígono vazio devolve false', () => {
  assertEquals(isPointInPolygon({ x: 1, y: 1 }, []), false);
});

// ─── isBoxInZone (unitários) ─────────────────────────────────────────────────
Deno.test('isBoxInZone: bbox cujo centro está dentro do polígono', () => {
  assertEquals(isBoxInZone({ x: 3, y: 3, width: 4, height: 4 }, polygon.geometry), true);
});

Deno.test('isBoxInZone: bbox cujo centro está fora do polígono', () => {
  assertEquals(isBoxInZone({ x: 20, y: 20, width: 2, height: 2 }, polygon.geometry), false);
});

Deno.test('isBoxInZone: shape rectangle usa mesma lógica de polígono', () => {
  assertEquals(isBoxInZone({ x: 4, y: 4, width: 2, height: 2 }, rectangle.geometry), true);
});

Deno.test('isBoxInZone: circle usa distância euclidiana', () => {
  assertEquals(isBoxInZone({ x: 48, y: 48, width: 4, height: 4 }, circle.geometry), true);
  assertEquals(isBoxInZone({ x: 70, y: 70, width: 2, height: 2 }, circle.geometry), false);
});

Deno.test('isBoxInZone: circle sem center/radius devolve false (fail-closed)', () => {
  const broken: ZoneGeometry = { shape: 'circle', points: [] };
  assertEquals(isBoxInZone({ x: 0, y: 0, width: 1, height: 1 }, broken), false);
});

Deno.test("isBoxInZone: shape 'line' não suportada devolve false", () => {
  const line: ZoneGeometry = { shape: 'line', points: squarePoints };
  assertEquals(isBoxInZone({ x: 5, y: 5, width: 1, height: 1 }, line), false);
});

// ─── matchesRuleZone: zone_id nula/undefined ─────────────────────────────────
Deno.test('matchesRuleZone: zone_id null sempre casa (fail-open)', () => {
  assertEquals(
    matchesRuleZone(
      { zone_id: null },
      { bounding_box: { x: 999, y: 999, width: 1, height: 1 } },
      zones
    ),
    true
  );
});

Deno.test('matchesRuleZone: zone_id undefined sempre casa', () => {
  assertEquals(matchesRuleZone({}, { point: { x: 999, y: 999 } }, zones), true);
});

Deno.test("matchesRuleZone: zone_id '' (string vazia) trata como sem zona", () => {
  assertEquals(matchesRuleZone({ zone_id: '' }, { point: { x: 999, y: 999 } }, zones), true);
});

// ─── matchesRuleZone: compatibilidade com callers sem detection ──────────────
Deno.test('matchesRuleZone: sem detection + zone_id → mantém true (compat)', () => {
  assertEquals(matchesRuleZone({ zone_id: 'z1' }, null, zones), true);
  assertEquals(matchesRuleZone({ zone_id: 'z1' }, undefined, zones), true);
  assertEquals(matchesRuleZone({ zone_id: 'z1' }, {}, zones), true);
  assertEquals(
    matchesRuleZone({ zone_id: 'z1' }, { bounding_box: null, point: null }, zones),
    true
  );
});

// ─── matchesRuleZone: bounding_box vs polígono ───────────────────────────────
Deno.test('matchesRuleZone: bbox dentro do polígono casa', () => {
  assertEquals(
    matchesRuleZone(
      { zone_id: 'z1' },
      { bounding_box: { x: 4, y: 4, width: 2, height: 2 } },
      zones
    ),
    true
  );
});

Deno.test('matchesRuleZone: bbox fora do polígono é descartado', () => {
  assertEquals(
    matchesRuleZone(
      { zone_id: 'z1' },
      { bounding_box: { x: 100, y: 100, width: 2, height: 2 } },
      zones
    ),
    false
  );
});

// ─── matchesRuleZone: ponto vs círculo/polígono ──────────────────────────────
Deno.test('matchesRuleZone: ponto dentro do círculo casa', () => {
  assertEquals(matchesRuleZone({ zone_id: 'z2' }, { point: { x: 55, y: 52 } }, zones), true);
});

Deno.test('matchesRuleZone: ponto exatamente no raio do círculo casa (≤)', () => {
  assertEquals(matchesRuleZone({ zone_id: 'z2' }, { point: { x: 60, y: 50 } }, zones), true);
});

Deno.test('matchesRuleZone: ponto fora do círculo descartado', () => {
  assertEquals(matchesRuleZone({ zone_id: 'z2' }, { point: { x: 100, y: 100 } }, zones), false);
});

Deno.test('matchesRuleZone: ponto dentro do polígono casa', () => {
  assertEquals(matchesRuleZone({ zone_id: 'z1' }, { point: { x: 5, y: 5 } }, zones), true);
});

// ─── matchesRuleZone: precedência bbox > point ───────────────────────────────
Deno.test('matchesRuleZone: bbox tem precedência sobre point quando ambos presentes', () => {
  // bbox dentro, point fora → segue bbox (true)
  assertEquals(
    matchesRuleZone(
      { zone_id: 'z1' },
      { bounding_box: { x: 4, y: 4, width: 2, height: 2 }, point: { x: 999, y: 999 } },
      zones
    ),
    true
  );
});

// ─── matchesRuleZone: fail-closed ────────────────────────────────────────────
Deno.test('matchesRuleZone: zona inativa é fail-closed', () => {
  assertEquals(
    matchesRuleZone(
      { zone_id: 'z3' },
      { bounding_box: { x: 4, y: 4, width: 2, height: 2 } },
      zones
    ),
    false
  );
});

Deno.test('matchesRuleZone: zona inexistente é fail-closed', () => {
  assertEquals(matchesRuleZone({ zone_id: 'z-missing' }, { point: { x: 5, y: 5 } }, zones), false);
});

Deno.test('matchesRuleZone: mapa vazio + zone_id declarado → fail-closed', () => {
  assertEquals(matchesRuleZone({ zone_id: 'z1' }, { point: { x: 5, y: 5 } }, new Map()), false);
});

// ─── normalizeGeometry ───────────────────────────────────────────────────────
Deno.test('normalizeGeometry: array legado de pontos vira polígono', () => {
  const geom = normalizeGeometry([
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ]);
  assertEquals(geom?.shape, 'polygon');
  assertEquals(geom?.points.length, 3);
});

Deno.test('normalizeGeometry: objeto completo circle preserva center/radius', () => {
  const geom = normalizeGeometry({
    shape: 'circle',
    points: [],
    center: { x: 1, y: 2 },
    radius: 5,
  });
  assertEquals(geom?.shape, 'circle');
  assertEquals(geom?.radius, 5);
  assertEquals(geom?.center?.x, 1);
});

Deno.test('normalizeGeometry: array com < 3 pontos válidos → null', () => {
  assertEquals(normalizeGeometry([{ x: 0, y: 0 }]), null);
  assertEquals(normalizeGeometry([]), null);
});

Deno.test('normalizeGeometry: objeto sem shape → null', () => {
  assertEquals(normalizeGeometry({ points: squarePoints }), null);
});

Deno.test('normalizeGeometry: entrada nula/primitiva → null', () => {
  assertEquals(normalizeGeometry(null), null);
  assertEquals(normalizeGeometry(undefined), null);
  assertEquals(normalizeGeometry('polygon'), null);
  assertEquals(normalizeGeometry(42), null);
});

Deno.test('normalizeGeometry: array descarta pontos inválidos', () => {
  const geom = normalizeGeometry([{ x: 0, y: 0 }, { x: 1, y: 1 }, { foo: 'bar' }, { x: 2, y: 2 }]);
  assertEquals(geom?.points.length, 3);
});

// ─── Integração: fetchZonesById com Supabase mock ────────────────────────────
type QueryResult = { data: unknown; error: unknown };
function mockSupabase(result: QueryResult, capture?: { calls: unknown[] }) {
  const builder: Record<string, unknown> = {};
  builder.select = (_cols: string) => builder;
  builder.eq = (col: string, val: unknown) => {
    capture?.calls.push({ op: 'eq', col, val });
    return builder;
  };
  builder.in = (col: string, vals: unknown[]) => {
    capture?.calls.push({ op: 'in', col, vals });
    return Promise.resolve(result);
  };
  return {
    from: (table: string) => {
      capture?.calls.push({ op: 'from', table });
      return builder;
    },
  } as unknown as Parameters<typeof fetchZonesById>[0];
}

Deno.test('fetchZonesById: devolve mapa vazio quando zoneIds é vazio', async () => {
  const capture = { calls: [] as unknown[] };
  const client = mockSupabase({ data: [], error: null }, capture);
  const map = await fetchZonesById(client, 'user-1', []);
  assertEquals(map.size, 0);
  assertEquals(capture.calls.length, 0, 'não deve chamar o banco quando não há ids');
});

Deno.test('fetchZonesById: deduplica ids repetidos antes de consultar', async () => {
  const capture = { calls: [] as unknown[] };
  const client = mockSupabase({ data: [], error: null }, capture);
  await fetchZonesById(client, 'user-1', ['a', 'a', 'b', 'a', 'b']);
  const inCall = capture.calls.find((c) => (c as { op: string }).op === 'in') as
    { op: string; vals: string[] } | undefined;
  assertEquals(inCall?.vals.sort(), ['a', 'b']);
});

Deno.test('fetchZonesById: normaliza points e ignora geometrias inválidas', async () => {
  const client = mockSupabase({
    data: [
      { id: 'ok-array', is_active: true, points: squarePoints },
      {
        id: 'ok-circle',
        is_active: true,
        points: { shape: 'circle', points: [], center: { x: 0, y: 0 }, radius: 3 },
      },
      { id: 'bad-few-pts', is_active: true, points: [{ x: 0, y: 0 }] },
      { id: 'bad-null', is_active: true, points: null },
    ],
    error: null,
  });
  const map = await fetchZonesById(client, 'user-1', [
    'ok-array',
    'ok-circle',
    'bad-few-pts',
    'bad-null',
  ]);
  assertEquals(map.size, 2);
  assertEquals(map.get('ok-array')?.geometry.shape, 'polygon');
  assertEquals(map.get('ok-circle')?.geometry.shape, 'circle');
});

Deno.test('fetchZonesById: erro do banco devolve mapa vazio (fail-closed)', async () => {
  const client = mockSupabase({ data: null, error: { message: 'boom' } });
  const map = await fetchZonesById(client, 'user-1', ['a']);
  assertEquals(map.size, 0);
});

// ─── Integração ponta-a-ponta: fetch + matches ───────────────────────────────
Deno.test('integração: fetchZonesById + matchesRuleZone reproduzem fluxo real', async () => {
  const client = mockSupabase({
    data: [
      { id: 'gate', is_active: true, points: squarePoints },
      { id: 'yard', is_active: false, points: squarePoints },
    ],
    error: null,
  });
  const map = await fetchZonesById(client, 'user-1', ['gate', 'yard']);

  // Regra "gate" com detecção dentro → dispara.
  assertEquals(
    matchesRuleZone(
      { zone_id: 'gate' },
      { bounding_box: { x: 4, y: 4, width: 2, height: 2 } },
      map
    ),
    true
  );
  // Mesma regra com detecção fora → descarta.
  assertEquals(matchesRuleZone({ zone_id: 'gate' }, { point: { x: 999, y: 999 } }, map), false);
  // Regra "yard" (zona inativa) → fail-closed mesmo dentro.
  assertEquals(matchesRuleZone({ zone_id: 'yard' }, { point: { x: 5, y: 5 } }, map), false);
  // Regra sem zone_id → sempre dispara.
  assertEquals(matchesRuleZone({ zone_id: null }, { point: { x: 999, y: 999 } }, map), true);
});
