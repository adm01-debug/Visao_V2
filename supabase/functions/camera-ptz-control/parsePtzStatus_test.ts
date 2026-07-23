import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parsePtzStatus } from './index.ts';

Deno.test('parsePtzStatus: posições positivas + MoveStatus IDLE', () => {
  const xml = `
    <tt:PTZStatus>
      <tt:Position>
        <tt:PanTilt x="0.34" y="0.12" xmlns:tt="..."/>
        <tt:Zoom x="0.75"/>
      </tt:Position>
      <tt:MoveStatus>
        <tt:PanTilt>IDLE</tt:PanTilt>
        <tt:Zoom>IDLE</tt:Zoom>
      </tt:MoveStatus>
      <tt:UtcTime>2026-07-23T20:00:00Z</tt:UtcTime>
    </tt:PTZStatus>`;
  const out = parsePtzStatus(xml);
  assertEquals(out.position, { pan: 0.34, tilt: 0.12, zoom: 0.75 });
  assertEquals(out.moving, { pan_tilt: false, zoom: false });
  assertEquals(out.utc, '2026-07-23T20:00:00Z');
});

Deno.test('parsePtzStatus: posições negativas + MoveStatus MOVING', () => {
  const xml = `<tt:PanTilt x="-0.87" y="-0.05"/><tt:Zoom x="0.10"/>
    <tt:MoveStatus><tt:PanTilt>MOVING</tt:PanTilt><tt:Zoom>IDLE</tt:Zoom></tt:MoveStatus>`;
  const out = parsePtzStatus(xml);
  assertEquals(out.position, { pan: -0.87, tilt: -0.05, zoom: 0.1 });
  assertEquals(out.moving, { pan_tilt: true, zoom: false });
  assertEquals(out.utc, null);
});

Deno.test('parsePtzStatus: ausência de Zoom + PanTilt somente', () => {
  const xml = `<tt:PanTilt x="0.0" y="1.0"/>`;
  const out = parsePtzStatus(xml);
  assertEquals(out.position, { pan: 0, tilt: 1, zoom: null });
  assertEquals(out.moving, { pan_tilt: null, zoom: null });
});

Deno.test('parsePtzStatus: XML vazio retorna nulos', () => {
  const out = parsePtzStatus('');
  assertEquals(out.position, { pan: null, tilt: null, zoom: null });
  assertEquals(out.moving, { pan_tilt: null, zoom: null });
  assertEquals(out.utc, null);
});
