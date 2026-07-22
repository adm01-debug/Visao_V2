import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { matchesRuleZone, normalizeGeometry, type ZoneRow } from "./zoneMatcher.ts";

const polygon: ZoneRow = {
  id: "z1", is_active: true,
  geometry: { shape: "polygon", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] },
};
const circle: ZoneRow = {
  id: "z2", is_active: true,
  geometry: { shape: "circle", points: [], center: { x: 50, y: 50 }, radius: 10 },
};
const inactive: ZoneRow = { ...polygon, id: "z3", is_active: false };
const zones = new Map<string, ZoneRow>([[polygon.id, polygon], [circle.id, circle], [inactive.id, inactive]]);

Deno.test("regra sem zone_id sempre casa", () => {
  assertEquals(matchesRuleZone({ zone_id: null }, { bounding_box: { x: 1000, y: 1000, width: 1, height: 1 } }, zones), true);
});

Deno.test("bounding_box dentro do polígono casa", () => {
  assertEquals(matchesRuleZone({ zone_id: "z1" }, { bounding_box: { x: 4, y: 4, width: 2, height: 2 } }, zones), true);
});

Deno.test("bounding_box fora do polígono é descartado", () => {
  assertEquals(matchesRuleZone({ zone_id: "z1" }, { bounding_box: { x: 100, y: 100, width: 2, height: 2 } }, zones), false);
});

Deno.test("ponto dentro do círculo casa", () => {
  assertEquals(matchesRuleZone({ zone_id: "z2" }, { point: { x: 55, y: 52 } }, zones), true);
});

Deno.test("ponto fora do círculo é descartado", () => {
  assertEquals(matchesRuleZone({ zone_id: "z2" }, { point: { x: 100, y: 100 } }, zones), false);
});

Deno.test("zona inativa fail-closed", () => {
  assertEquals(matchesRuleZone({ zone_id: "z3" }, { bounding_box: { x: 4, y: 4, width: 2, height: 2 } }, zones), false);
});

Deno.test("zona inexistente fail-closed", () => {
  assertEquals(matchesRuleZone({ zone_id: "z-missing" }, { point: { x: 5, y: 5 } }, zones), false);
});

Deno.test("sem detection e com zone_id → mantém compatibilidade (true)", () => {
  assertEquals(matchesRuleZone({ zone_id: "z1" }, null, zones), true);
  assertEquals(matchesRuleZone({ zone_id: "z1" }, {}, zones), true);
});

Deno.test("normalizeGeometry aceita array legado de pontos", () => {
  const geom = normalizeGeometry([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]);
  assertEquals(geom?.shape, "polygon");
  assertEquals(geom?.points.length, 3);
});

Deno.test("normalizeGeometry aceita objeto completo", () => {
  const geom = normalizeGeometry({ shape: "circle", points: [], center: { x: 1, y: 2 }, radius: 5 });
  assertEquals(geom?.shape, "circle");
  assertEquals(geom?.radius, 5);
});

Deno.test("normalizeGeometry descarta array com poucos pontos", () => {
  assertEquals(normalizeGeometry([{ x: 0, y: 0 }]), null);
});
