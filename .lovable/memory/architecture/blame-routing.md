---
name: Blame Routing to Maintenance
description: Onda 147 — alertas de manutenção nascem endereçados ao responsável (evaluate_blame_alerts), causa comum por agente, gate db:check:blame-routing
type: architecture
---

# Roteamento de alerta por responsável (Onda 147)

A Onda 146 respondeu "de quem é a culpa?". Aqui a culpa vira **endereço**:
`public.evaluate_blame_alerts(p_now)` (cron `*/10 * * * *`) lê
`edge_function_error_audit` e cria alertas em `maintenance_alert_events` já com
`detail.owner`.

## Donos (`public.blame_owner`)
`device→field_tech` · `transport→network_ops` · `config→registry_admin` ·
`cloud→platform` · `unknown→triage` · `caller→NULL` (**nunca alerta**: aborto de
quem chamou não é falha de ninguém).

## Regras que existem por causa de falha real
- **Causa comum** — ≥3 câmeras `device` sob o MESMO `relay_agent_id` viram UM
  alerta `blame:common-cause:<agente>` como `transport`, e as câmeras absorvidas
  ficam proibidas de gerar alerta individual. Sem isso, um switch caído
  despacharia N técnicos a campo.
- **Amostra mínima 3 / crítico em 10** — uma falha isolada nunca acorda ninguém.
- **`unknown` jamais é crítico** — é pedido de triagem, não despacho.
- **Teto de 12 alertas por execução**, crítico primeiro, `truncated` no retorno.
- **Cooldown 60min (aviso) / 30min (crítico)**, e a janela de silêncio é
  limitada por `created_at <= p_now`: alerta criado DEPOIS não silencia análise
  de instante anterior (senão o relógio injetado quebra).
- A rotina é **reentrante na mesma transação** (`DROP TABLE IF EXISTS` nas temp
  tables) — sem isso o exercício em transação revertida não roda.

## UI
`src/lib/maintenance/maintenanceOwner.ts` é a regra única de tradução do
`detail` para a tela. `detail` vem da rede: rótulo fora do vocabulário vira
`triage`, nunca lança, e **alerta sem `owner` continua aparecendo** (rotinas das
Ondas 110–135 são anteriores ao roteamento).

## Gates
- `npm run sim:wave147` — modelo de referência, 450 cenários, 7 invariantes.
- `npm run db:check:blame-routing` (em `db:check:all`) — executa a rotina em
  transação revertida e exige **paridade SQL × modelo**. Isola por relógio
  histórico (`now() - 90 days`), nunca por `DELETE`: o papel do CI tem só
  SELECT/INSERT na auditoria, e isso é proposital.
