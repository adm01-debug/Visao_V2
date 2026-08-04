#!/usr/bin/env node
// Wave 41 — Fuzz de anotação de snapshot.
// Invariantes:
//   1. Nenhum stroke/fill fora do frame (clamp obrigatório)
//   2. Box com área <= 0 é ignorado
//   3. Cor por classe é determinística
//   4. Função é pura: mesmo input → mesmo número de draws
import { annotateFrame, resolveBoxColor, clampBox } from '../src/lib/snapshotAnnotator.ts';

const CLASSES = ['person', 'vehicle', 'plate', 'face', 'ppe', 'other', undefined];
const N = 500;
let pass = 0,
  fail = 0;
const failures = [];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function makeCtx(frame) {
  const violations = [];
  return {
    ctx: {
      lineWidth: 0,
      strokeStyle: '',
      fillStyle: '',
      font: '',
      globalAlpha: 1,
      textBaseline: '',
      strokeRect(x, y, w, h) {
        if (x < 0 || y < 0 || x + w > frame.width + 0.001 || y + h > frame.height + 0.001) {
          violations.push(`stroke oob: ${x},${y},${w},${h}`);
        }
      },
      fillRect(x, y, w, h) {
        if (
          x < -0.001 ||
          y < -0.001 ||
          x + w > frame.width + 0.001 ||
          y + h > frame.height + 0.001
        ) {
          violations.push(`fill oob: ${x},${y},${w},${h}`);
        }
      },
      fillText(t, x, y) {
        if (x < 0 || y < 0 || x > frame.width || y > frame.height) {
          violations.push(`text oob: ${t}@${x},${y}`);
        }
      },
      measureText(t) {
        return { width: t.length * 7 };
      },
    },
    violations,
  };
}

for (let i = 0; i < N; i++) {
  const frame = { width: rand(320, 4096), height: rand(240, 2160) };
  const count = rand(0, 10);
  const dets = Array.from({ length: count }, () => ({
    x: rand(-50, frame.width + 50),
    y: rand(-50, frame.height + 50),
    w: rand(-100, 300),
    h: rand(-100, 300),
    label: pick(['', 'car', 'ABC-1234', 'très longo label unicode 🚗', undefined]),
    score: Math.random(),
    objectClass: pick(CLASSES),
  }));

  const { ctx, violations } = makeCtx(frame);
  let drawn;
  try {
    drawn = annotateFrame(ctx, frame, dets);
  } catch (e) {
    fail++;
    failures.push({ i, error: String(e) });
    continue;
  }

  // Inv 1: sem out-of-bounds
  if (violations.length > 0) {
    fail++;
    failures.push({ i, violations: violations.slice(0, 3) });
    continue;
  }

  // Inv 2: drawn = nº de boxes válidos após clamp
  const validCount = dets.filter((d) => clampBox(d, frame) !== null).length;
  if (drawn !== validCount) {
    fail++;
    failures.push({ i, drawn, validCount });
    continue;
  }

  // Inv 3: cor determinística
  if (resolveBoxColor('plate') !== resolveBoxColor('plate')) {
    fail++;
    continue;
  }

  // Inv 4: determinismo — reexecutar produz mesmo drawn
  const { ctx: ctx2 } = makeCtx(frame);
  const drawn2 = annotateFrame(ctx2, frame, dets);
  if (drawn !== drawn2) {
    fail++;
    failures.push({ i, drawn, drawn2 });
    continue;
  }

  pass++;
}

const out = { total: N, pass, fail, failures: failures.slice(0, 5) };
console.log(JSON.stringify(out, null, 2));
if (fail > 0) process.exit(1);
