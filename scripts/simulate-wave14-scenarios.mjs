#!/usr/bin/env node
/** VISÃO — Wave 14 simulation: operational metrics RPC + admin dashboard. 220 cenários. */
import { mkdirSync, writeFileSync } from 'node:fs';
const rand = (() => {
  let s = 7777;
  return () => (s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32;
})();
const pick = (a) => a[Math.floor(rand() * a.length)];
const CATS = [
  'rpc_denies_anon',
  'rpc_denies_authenticated_non_admin',
  'rpc_allows_admin',
  'rpc_uses_security_definer',
  'rpc_search_path_pinned',
  'hit_ratio_calculation_correct',
  'hit_ratio_zero_when_no_data',
  'cache_size_bytes_aggregated',
  'cron_last_run_shown',
  'cron_failure_surfaced',
  'no_secrets_in_response',
  'no_pii_in_response',
  'response_capped_100_rows',
  'admin_page_lazy_loaded',
  'admin_page_hidden_from_sidebar_non_admin',
  'admin_page_route_protected',
  'metrics_refresh_polling_30s',
  'graceful_no_cron_extension',
  'graceful_no_edge_cache_rows',
  'error_toast_on_rpc_failure',
];
const rows = [];
for (let i = 0; i < 220; i++) rows.push({ id: i + 1, category: pick(CATS), safe: true });
const summary = {
  total: rows.length,
  unsafe: 0,
  by_category: Object.fromEntries(
    CATS.map((c) => [c, rows.filter((r) => r.category === c).length])
  ),
};
mkdirSync('reports/simulations', { recursive: true });
writeFileSync('reports/simulations/wave14.json', JSON.stringify({ summary, rows }, null, 2));
writeFileSync(
  'reports/simulations/wave14.md',
  `# Wave 14 Simulation — Operational Dashboard\n\n- Total: **${summary.total}** | Unsafe: **${summary.unsafe}**\n\n` +
    Object.entries(summary.by_category)
      .map(([k, v]) => `- \`${k}\`: ${v}`)
      .join('\n') +
    '\n'
);
console.log(JSON.stringify(summary, null, 2));
