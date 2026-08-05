#!/usr/bin/env node
/** Onda Shinobi 8 — Prober classification simulation */
let pass = 0,
  fail = 0;
const check = (n, c) => {
  if (c) pass++;
  else {
    fail++;
    console.error('❌', n);
  }
};

function classify({ ok, status, elapsed, timeout }) {
  if (timeout) return { status: 'fail', message: 'timeout' };
  if (!ok) return { status: 'fail', message: `http_${status}` };
  if (elapsed > 5000) return { status: 'fail', message: 'slow_response' };
  return { status: 'ok', message: null };
}
check('200 fast', classify({ ok: true, status: 200, elapsed: 300 }).status === 'ok');
check('200 slow', classify({ ok: true, status: 200, elapsed: 6000 }).status === 'fail');
check('404', classify({ ok: false, status: 404, elapsed: 100 }).status === 'fail');
check(
  'timeout',
  classify({ ok: false, status: 0, elapsed: 10000, timeout: true }).message === 'timeout'
);
check('500', classify({ ok: false, status: 500, elapsed: 100 }).message === 'http_500');

// URL validation: only http/https
function isProbableStreamUrl(u) {
  try {
    const url = new URL(u);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}
check('rtsp rejected', !isProbableStreamUrl('rtsp://x/y'));
check('http ok', isProbableStreamUrl('http://x/y.m3u8'));
check('https ok', isProbableStreamUrl('https://x/y.m3u8'));
check('bad url', !isProbableStreamUrl('not-a-url'));

// Batch semantics: max 30 cameras per invocation, dedupe by id
function dedupe(cams) {
  return Array.from(new Map(cams.map((c) => [c.id, c])).values());
}
check('dedupe', dedupe([{ id: 1 }, { id: 1 }, { id: 2 }]).length === 2);

// 300 permutações
for (let i = 0; i < 300; i++) {
  const elapsed = Math.floor(Math.random() * 10000);
  const ok = Math.random() < 0.7;
  const st = ok ? 200 : Math.random() < 0.5 ? 404 : 500;
  const r = classify({ ok, status: st, elapsed });
  const shouldFail = !ok || elapsed > 5000;
  check(`perm ${i}`, (r.status === 'fail') === shouldFail);
}

console.log(`\nResultado: ${pass}/${pass + fail} ✅ (falhas: ${fail})`);
if (fail) process.exit(1);
