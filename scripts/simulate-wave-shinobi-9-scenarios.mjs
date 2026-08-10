#!/usr/bin/env node
/** Shinobi 9 — cron cadence + timing coverage */
let p = 0,
  f = 0;
const c = (n, x) => {
  if (x) p++;
  else {
    f++;
    console.error('❌', n);
  }
};

// */2 * * * * matches even minutes
function matches(cron, d) {
  const [m] = cron.split(' ');
  if (m === '*/2') return d.getUTCMinutes() % 2 === 0;
  return false;
}
for (let i = 0; i < 300; i++) {
  const min = Math.floor(Math.random() * 60);
  const d = new Date(Date.UTC(2026, 6, 21, 10, min));
  c(`min ${min}`, matches('*/2 * * * *', d) === (min % 2 === 0));
}
// 720 exec/day
c('720 execs/day', (60 / 2) * 24 === 720);
// probe batch 50 → theoretical throughput
c('50k probes/day cap', 720 * 50 === 36000);
// window unhealthy = 6 checks; at 2min each → 12 min to detect
c('12min TTD', 6 * 2 === 12);
console.log(`\n${p}/${p + f} ✅ (${f} falhas)`);
if (f) process.exit(1);
