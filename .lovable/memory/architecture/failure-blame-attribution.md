---
name: Failure Blame Attribution
description: Onda 146 — regra única de atribuição de culpa (device/transport/config/caller/cloud) persistida em edge_function_error_audit, gate db:check:error-blame
type: architecture
---

# Atribuição de culpa em falhas de Edge Function (Onda 146)

`supabase/functions/_shared/failureBlame.ts` é a **regra única** que responde
"de quem é a culpa?". Nunca duplicar essa lógica em função ou componente.

## Vocabulário fechado

`device` | `transport` | `config` | `caller` | `cloud` | `unknown` — cada valor
existe porque mapeia para uma **ação humana diferente**. Não criar rótulo novo
sem migração (há CHECK no banco).

## Regras (ordem de precedência)

- `R0_caller_aborted` — `aborted` sempre é `caller`, jamais acusa terceiros.
- `R1_cloud_dependency` — falha de RPC/banco/storage precede leitura de rede.
- `R2_upstream_responded` — houve HTTP: transporte funcionou. 401/403 ⇒ `config`.
- `R3_name_resolution` — `dns` é cadastro, nunca equipamento.
- `R4_local_reach_proven` — `run_from` `agent`/`relay` significa execução DENTRO
  da LAN ⇒ sobra o equipamento (`refused` na LAN ⇒ `config`).
- `R5_remote_path_opaque` — da nuvem, `timeout`/`reset`/`refused`/`unknown` são
  `transport`. **Acusar a câmera daqui é diagnóstico injusto.**
- `R6_deterministic_peer` — `tls`/`protocol`/`redirect_loop` provam diálogo ⇒ `device`.
- `R7_unknown` — sem sinal, `NULL` na auditoria (não poluir painel com "unknown").

Falha de TÚNEL é registrada com `run_from: "cloud"` (quem sofreu foi a nuvem),
por isso `relay` em R4 não mascara túnel caído.

## Persistência

`public.edge_function_error_audit` ganhou `network_kind`, `blame`, `blame_rule`
com CHECK de vocabulário e CHECK de pareamento (`blame` ⇔ `blame_rule`).
Índices parciais: `idx_edge_error_blame`, `idx_edge_error_network_kind`,
`idx_edge_error_camera_blame`.

Chamadores passam `error`, `upstream_status`, `cloud_dependency` ou
`network_kind` para `recordEdgeError`; `classifyAuditInput` faz o resto.

## Gates

- `npm run db:check:error-blame` (dentro de `db:check:all`) — exercita os CHECKs
  por INSERT real em transação revertida, não por leitura de catálogo.
- `supabase/functions/_shared/__tests__/failureBlame_test.ts` — matriz exaustiva
  de 1.120 cenários (classe × origem × status × dependência) com invariantes e
  detecção de regra inalcançável.
