// Onda 92 — Autovacuum overrides
const states = ['default', 'disabled', 'custom_scale', 'custom_threshold', 'custom_both'];
const churn = ['idle', 'low', 'medium', 'high', 'extreme'];
const sizes = ['tiny', 'small', 'medium', 'large', 'huge'];
const deadTuplePct = [0, 5, 15, 30, 60];
const s = [];
for (const st of states)
  for (const c of churn)
    for (const z of sizes)
      for (const d of deadTuplePct) {
        const critical = st === 'disabled' && d >= 15;
        const warn = (st === 'disabled' && d < 15) || (d >= 30 && st === 'default' && z !== 'tiny');
        s.push({ st, c, z, d, sev: critical ? 'critical' : warn ? 'warning' : 'ok' });
      }
const cc = s.filter((x) => x.sev === 'critical').length,
  ww = s.filter((x) => x.sev === 'warning').length;
console.log(
  `Cenários: ${s.length} | críticos: ${cc} | warnings: ${ww} | ok: ${s.length - cc - ww}`
);
console.log('Gaps: disable pode ser intencional (staging); scale=0 exige threshold explícito.');
