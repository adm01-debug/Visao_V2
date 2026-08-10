---
name: Conectores para centrais de monitoramento (Onda 126)
description: Fila SIA DC-09/Contact ID para Sigma, Moni e Commbox — mapa de códigos, dedupe, lease e recuo exponencial
type: feature
---

# Onda 126 — Centrais de monitoramento (Sigma / Moni / Commbox)

Protocolo: **SIA DC-09** transportando payload **Ademco Contact ID** (`"ADM-CID"`),
denominador comum das três receptoras. CRC-16/ARC obrigatório no envelope.

## Componentes

- `src/lib/integrations/monitoringCenter.ts` — fonte da verdade em TS: `CONTACT_ID_MAP`,
  `MONITORING_CENTER_POLICY`, `backoffSeconds`, `settleDispatch`, `dedupeKey`,
  `crc16Arc`, `formatContactIdFrame`.
- `supabase/functions/_shared/contactId.ts` — cópia literal do codificador para o edge runtime.
- `supabase/functions/monitoring-center-dispatch` — worker (cron `* * * * *`, lote 50).
- Tabelas: `monitoring_center_accounts` (CRUD do dono) e `monitoring_center_dispatches`
  (**somente leitura** para `authenticated`; escrita exclusiva das rotinas DEFINER).
- Rotinas: `monitoring_center_policy`, `contact_id_for_event`,
  `monitoring_center_backoff_seconds`, `enqueue_monitoring_center_event`,
  `claim_monitoring_center_dispatches`, `settle_monitoring_center_dispatch`,
  `reap_monitoring_center_leases(_at)`.

## Política (espelhada SQL ↔ TS, gate obrigatório)

maxAttempts 5 · backoff 15s dobrando até 600s · lease 60s · dedupe 120s ·
deadline 3600s · heartbeat 900s.

**Ordem das guardas:** prazo final vence tentativas restantes — entregar invasão
70 min atrasada faria a central despachar viatura para fato encerrado.

## Gates

- `npm run db:check:monitoring-centers` (dentro de `db:check:all`): RLS, privilégios via
  `aclexplode`, paridade literal SQL↔TS do mapa e do backoff, identidade do codificador
  front↔edge, bateria funcional em `BEGIN ... ROLLBACK`.
- `npm run simulate:monitoring-centers`: 17 suítes, >500 combinações da máquina de estados.

## Armadilhas já pagas

- `CONTACT_ID_MAP[kind]` sem `hasOwnProperty` devolvia `__proto__`/`toString` e inventava código.
- Os _default privileges_ do papel `postgres` reconcedem TUDO a `authenticated` no
  `CREATE TABLE`: é preciso `REVOKE ALL ... FROM authenticated` e regrantar o conjunto exato.
- HTTP 200 com corpo `NAK`/`DUH` é rejeição da receptora, não sucesso.
