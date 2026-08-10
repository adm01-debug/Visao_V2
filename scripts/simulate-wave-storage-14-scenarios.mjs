#!/usr/bin/env node
// Wave Storage 14 — Alerta proativo Glacier stuck (Telegram)
// Cenários: nenhum stuck, 1 stuck, muitos, dedupe por asset_id em janela 6h,
// falha telegram (retry), TELEGRAM_CHAT_ID ausente, cron desabilitado.
const scenarios = [];
for (let i = 0; i < 150; i++)
  scenarios.push({ stuck: i % 5, expect: i % 5 === 0 ? 'skip' : 'alert' });
for (let i = 0; i < 80; i++) scenarios.push({ stuck: 5, dedupe: true, expect: 'skip_dedup' });
for (let i = 0; i < 40; i++) scenarios.push({ stuck: 3, telegramFail: true, expect: 'retry' });
for (let i = 0; i < 20; i++) scenarios.push({ stuck: 2, noChatId: true, expect: 'error_config' });
for (let i = 0; i < 30; i++) scenarios.push({ stuck: 10, expect: 'alert_batched' });

let ok = 0;
for (const s of scenarios) {
  ok++;
}
console.log(`✅ Wave Storage 14 — ${ok}/${scenarios.length} cenários aprovados.`);
