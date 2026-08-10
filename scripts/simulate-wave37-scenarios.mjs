// Wave 37 — Simulação: BroadcastChannel sync entre N abas.
import { mkdirSync, writeFileSync } from 'node:fs';

class FakeChannel {
  static bus = new Map();
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    if (!FakeChannel.bus.has(name)) FakeChannel.bus.set(name, new Set());
    FakeChannel.bus.get(name).add(this);
  }
  postMessage(data) {
    for (const peer of FakeChannel.bus.get(this.name)) {
      if (peer !== this && peer.onmessage) peer.onmessage({ data });
    }
  }
  close() {
    FakeChannel.bus.get(this.name).delete(this);
  }
}

function makeTab() {
  const set = new Set();
  const ch = new FakeChannel('acks');
  ch.onmessage = (e) => set.add(e.data.key);
  return {
    seen: (key) => set.has(key),
    ack: (key) => {
      set.add(key);
      ch.postMessage({ key });
    },
    close: () => ch.close(),
  };
}

let pass = 0;
let fail = 0;
const failures = [];

// 200 cenários: N abas (2-6), M jobs stale (1-4), ordem aleatória de descoberta.
for (let i = 0; i < 200; i++) {
  FakeChannel.bus.clear();
  const tabsN = 2 + Math.floor(Math.random() * 5);
  const tabs = Array.from({ length: tabsN }, () => makeTab());
  const jobsN = 1 + Math.floor(Math.random() * 4);
  const jobs = Array.from({ length: jobsN }, (_, j) => `job-${j}::run-${i}`);

  let toasts = 0;
  // cada tab descobre cada job em ordem aleatória
  const events = [];
  for (const j of jobs) for (const t of tabs) events.push({ t, j });
  events.sort(() => Math.random() - 0.5);

  for (const { t, j } of events) {
    if (t.seen(j)) continue;
    t.ack(j);
    toasts++;
  }

  const ok = toasts === jobsN;
  if (!ok) {
    fail++;
    failures.push({ i, toasts, expected: jobsN, tabsN });
  } else pass++;
  tabs.forEach((t) => t.close());
}

mkdirSync('reports/simulations', { recursive: true });
writeFileSync(
  'reports/simulations/wave37.json',
  JSON.stringify(
    { wave: 37, total: pass + fail, pass, fail, failures: failures.slice(0, 10) },
    null,
    2
  )
);
console.log(`wave37: ${pass}/${pass + fail} pass`);
if (fail) process.exit(1);
