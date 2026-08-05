#!/usr/bin/env node
/**
 * Onda Shinobi 2 — Digital Zoom
 * Simula 400+ cenários cobrindo:
 *  - Clamp de pan em bordas para múltiplos níveis de zoom
 *  - Wheel zoom com invariante do ponto sob o cursor
 *  - Pinch zoom (touch 2 dedos)
 *  - Reset e limites min/max
 *  - Persistência serialização/desserialização
 */

const MIN_SCALE = 1;
const MAX_SCALE = 8;

function clampScale(s) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

// Retorna offsets clamped para que a imagem escalada nunca deixe ver o fundo.
// Coordenadas: origem central. Range livre para offset: ±(w*(scale-1)/2).
function clampOffsets({ offsetX, offsetY, scale, width, height }) {
  const s = clampScale(scale);
  const maxX = (width * (s - 1)) / 2;
  const maxY = (height * (s - 1)) / 2;
  return {
    scale: s,
    offsetX: Math.min(maxX, Math.max(-maxX, offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, offsetY)),
  };
}

// Wheel zoom mantendo o ponto sob o cursor fixo.
// State em coordenadas do container (origem no centro).
function zoomAtPoint({ scale, offsetX, offsetY, width, height }, { cursorX, cursorY, factor }) {
  const newScale = clampScale(scale * factor);
  const applied = newScale / scale;
  // Ponto no espaço da imagem antes do zoom:
  const imgX = (cursorX - width / 2 - offsetX) / scale;
  const imgY = (cursorY - height / 2 - offsetY) / scale;
  // Novo offset para manter imgX,imgY sob o cursor:
  const nextOffsetX = cursorX - width / 2 - imgX * newScale;
  const nextOffsetY = cursorY - height / 2 - imgY * newScale;
  return clampOffsets({
    offsetX: nextOffsetX,
    offsetY: nextOffsetY,
    scale: newScale,
    width,
    height,
  });
}

function serialize(state) {
  return JSON.stringify({
    s: Number(state.scale.toFixed(4)),
    x: Math.round(state.offsetX),
    y: Math.round(state.offsetY),
  });
}
function deserialize(str, viewport) {
  try {
    const p = JSON.parse(str);
    if (typeof p.s !== 'number' || typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    return clampOffsets({
      scale: p.s,
      offsetX: p.x,
      offsetY: p.y,
      width: viewport.width,
      height: viewport.height,
    });
  } catch {
    return null;
  }
}

let checks = 0,
  failures = 0;
const fail = (m) => {
  failures++;
  console.error('FAIL:', m);
};
const assert = (c, m) => {
  checks++;
  if (!c) fail(m);
};

const W = 1280,
  H = 720;

// ── 1. Clamp em cada nível de zoom (8 níveis × 8 direções extremas = 64)
for (const s of [1, 1.5, 2, 2.5, 3, 4, 6, 8]) {
  const maxX = (W * (s - 1)) / 2;
  const maxY = (H * (s - 1)) / 2;
  for (const [dx, dy] of [
    [9999, 0],
    [-9999, 0],
    [0, 9999],
    [0, -9999],
    [9999, 9999],
    [-9999, 9999],
    [9999, -9999],
    [-9999, -9999],
  ]) {
    const r = clampOffsets({ offsetX: dx, offsetY: dy, scale: s, width: W, height: H });
    assert(
      Math.abs(r.offsetX) <= maxX + 1e-6,
      `pan X clamp @ scale=${s}: got ${r.offsetX}, max ${maxX}`
    );
    assert(
      Math.abs(r.offsetY) <= maxY + 1e-6,
      `pan Y clamp @ scale=${s}: got ${r.offsetY}, max ${maxY}`
    );
  }
}

// ── 2. Invariante do wheel zoom (12 posições × 6 fatores = 72)
for (const cx of [50, 200, 640, 900, 1200, 1279]) {
  for (const cy of [10, 200, 360, 500, 700]) {
    for (const f of [1.1, 1.25, 1.5, 0.9, 0.8, 0.7]) {
      const before = { scale: 2, offsetX: 0, offsetY: 0, width: W, height: H };
      // Ponto no espaço da imagem antes:
      const imgX = (cx - W / 2 - before.offsetX) / before.scale;
      const imgY = (cy - H / 2 - before.offsetY) / before.scale;
      const after = zoomAtPoint(before, { cursorX: cx, cursorY: cy, factor: f });
      // Onde esse ponto está no viewport agora?
      const projX = imgX * after.scale + W / 2 + after.offsetX;
      const projY = imgY * after.scale + H / 2 + after.offsetY;
      // Se o clamp mexeu offset, tolerância mais alta; caso contrário, quase perfeito.
      const untouchedX = Math.abs(after.offsetX) < (W * (after.scale - 1)) / 2 - 0.5;
      const untouchedY = Math.abs(after.offsetY) < (H * (after.scale - 1)) / 2 - 0.5;
      if (untouchedX)
        assert(Math.abs(projX - cx) < 1, `wheel invariant X (cx=${cx},f=${f}) drift ${projX - cx}`);
      if (untouchedY)
        assert(Math.abs(projY - cy) < 1, `wheel invariant Y (cy=${cy},f=${f}) drift ${projY - cy}`);
    }
  }
}

// ── 3. Limites min/max
for (const s of [0.1, 0.5, 0.99, 1, 8, 8.5, 100]) {
  const r = clampScale(s);
  assert(r >= MIN_SCALE && r <= MAX_SCALE, `scale bound broken for ${s}`);
}
// Reset via zoomAtPoint até scale=1 zera offsets
{
  const reset = clampOffsets({ scale: 1, offsetX: 500, offsetY: 500, width: W, height: H });
  assert(reset.offsetX === 0 && reset.offsetY === 0, 'reset at scale=1 must zero offsets');
}

// ── 4. Persistência (round-trip)
for (let i = 0; i < 50; i++) {
  const st = {
    scale: 1 + Math.random() * 7,
    offsetX: (Math.random() - 0.5) * W,
    offsetY: (Math.random() - 0.5) * H,
  };
  const clamped = clampOffsets({ ...st, width: W, height: H });
  const round = deserialize(serialize(clamped), { width: W, height: H });
  assert(round !== null, `deserialize failed round #${i}`);
  assert(Math.abs(round.scale - clamped.scale) < 0.01, `scale drift round #${i}`);
  assert(Math.abs(round.offsetX - clamped.offsetX) < 2, `offX drift round #${i}`);
}

// Deserialização de lixo
for (const bad of ['', '{', 'null', '{"s":"a"}', '{"s":1}', '[1,2,3]']) {
  const r = deserialize(bad, { width: W, height: H });
  assert(r === null, `bad payload accepted: ${bad}`);
}

// ── 5. Pinch (200 gestos aleatórios)
for (let i = 0; i < 200; i++) {
  const startDist = 50 + Math.random() * 500;
  const endDist = 50 + Math.random() * 500;
  const factor = endDist / startDist;
  const cx = Math.random() * W;
  const cy = Math.random() * H;
  const before = { scale: 1 + Math.random() * 4, offsetX: 0, offsetY: 0, width: W, height: H };
  const after = zoomAtPoint(before, { cursorX: cx, cursorY: cy, factor });
  assert(after.scale >= MIN_SCALE && after.scale <= MAX_SCALE, `pinch scale bound #${i}`);
  const maxX = (W * (after.scale - 1)) / 2;
  const maxY = (H * (after.scale - 1)) / 2;
  assert(Math.abs(after.offsetX) <= maxX + 1e-6, `pinch pan X clamp #${i}`);
  assert(Math.abs(after.offsetY) <= maxY + 1e-6, `pinch pan Y clamp #${i}`);
}

// ── 6. Drag pan (100 sequências)
for (let i = 0; i < 100; i++) {
  const scale = 2 + Math.random() * 4;
  let st = { scale, offsetX: 0, offsetY: 0 };
  const steps = 5 + Math.floor(Math.random() * 10);
  for (let k = 0; k < steps; k++) {
    const dx = (Math.random() - 0.5) * 400;
    const dy = (Math.random() - 0.5) * 400;
    st = clampOffsets({
      scale: st.scale,
      offsetX: st.offsetX + dx,
      offsetY: st.offsetY + dy,
      width: W,
      height: H,
    });
    const maxX = (W * (st.scale - 1)) / 2;
    const maxY = (H * (st.scale - 1)) / 2;
    assert(Math.abs(st.offsetX) <= maxX + 1e-6, `drag pan X clamp iter=${i}/${k}`);
    assert(Math.abs(st.offsetY) <= maxY + 1e-6, `drag pan Y clamp iter=${i}/${k}`);
  }
}

console.log(`\n[Shinobi Wave 2] checks=${checks} failures=${failures}`);
process.exit(failures === 0 ? 0 : 1);
