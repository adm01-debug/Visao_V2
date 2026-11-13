# Visao_V2 - Prod Readiness Report

Base: main @ 6cb50f6da (== origin/main) | branch: claude/docs-prod-readiness-20261113-2039 | gerado em 2026-11-13 20:39

## 1. Inventario funcional (linha de base "sem perda de funcionalidade")

Levantado do codigo do main atual (6cb50f6da).

### Telas / rotas

Fonte: scripts/inventario/gerar-rotas.mjs -> inventario/estado/rotas.json

- 89 URLs, 77 rotas com pagina, 12 redirecionamentos, 67 protegidas, 22 itens de menu, 127 hooks.
- 84 componentes TSX em src/pages (Dashboard, Cameras, Analytics, Heatmap, Alerts, Recordings, People, NVRs, Schedules, Zones, PPE, Security, UserManagement, Help, Settings, Profile e mais).
- 42 rotas protegidas sem item de menu (acesso por URL) - alerta de navegacao, nao quebra funcionalidade.

### Edge functions

supabase/functions: 75 funcoes (admin-_, agent-_, camera-_, insightface-_, nvr-_, ptz-_, storage-tiering, watchdog*, public-api, upload-media, telegram, etc) + shared.

### Migrations

supabase/migrations: 363 arquivos (consolidated, storage_buckets, notification_config + serie timestamped de cameras/analytics/ppe/facial/streaming/storage tiering).

### Workflows GitHub

.github/workflows: 46 arquivos (ci, test, lint, e2e-playwright, e2e, deploy, cd, pr-verify, knip, codeql, coverage, security, etc).

## 2. Cobertura do objetivo (OK / BLOQUEADO, com prova)

| #   | Item                             | Status        | Prova                                                                                                                                                                                           |
| --- | -------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Inventario                       | OK            | este arquivo + inventario/estado/rotas.json (89 urls/77 rotas/67 protegidas)                                                                                                                    |
| 2   | Cobertura                        | PARCIAL       | itens de codigo levantados; validacao no ar pendente (ver 7)                                                                                                                                    |
| 3   | Qualidade (build/lint/type/test) | OK via CI     | runs 43517330712 (CI), 43517330819 (Lint), 43517330828 (Knip) success no main @6cb50f6da                                                                                                        |
| 3b  | E2E                              | BLOQUEADO     | run 43517330732 failure, exit 1, 252 passed, 124 failed, 7 flaky; causa = debito de infra (login/role + shards exigem Supabase vivo com usuario E2E + trigger on_auth_user_created_assign_role) |
| 4   | Workflows main                   | BLOQUEADO (1) | todos os runs do push #184 verdes EXCETO E2E Tests (43517330732)                                                                                                                                |
| 5   | Sem pela metade                  | BLOQUEADO     | varredura exaustiva de TODO/FIXME/handlers vazios nao executada nesta sessao; 42 rotas sem menu = alerta, nao bug                                                                               |
| 6   | Banco RLS/seguranca              | BLOQUEADO     | sem acesso direto ao banco/CLI nesta sessao (so publishable/secret) - nao provo RLS/advisors/sync de migrations                                                                                 |
| 7   | Producao                         | BLOQUEADO     | deploy #184 success (run 43517330736); logs de edge/banco pos-deploy nao inspecionados (sem acesso)                                                                                             |
| 8   | Entrega PRs                      | OK            | correcoes da sessao via PR + este relatorio                                                                                                                                                     |
| 9   | Relatorio                        | OK            | este arquivo                                                                                                                                                                                    |

## 3. Trabalho BLOQUEADO (causa exata)

- E2E (run 43517330732 exit 1): provisionar Supabase vivo (pmzxbffn) + usuario E2E + trigger de role. Sem isso nao fica verde.
- Banco RLS/advisors/sync: requer acesso direto (CLI/MCP supabase) indisponivel nesta sessao.
- TODO/FIXME/handlers vazios em codigo de producao: auditoria dedicada pendente.
- Logs de edge/producao pos-deploy #184: pendente acesso.

## 4. Proximos passos (executiveis via MCP)

1. Provisionar Supabase vivo + secrets + usuario E2E + trigger de role - destrava unico workflow vermelho (E2E) - infra + Visao_V2
2. Auditar RLS/seguranca/advisors do banco com acesso direto - fecha item 6 - Supabase pmzxbffn
3. Varrer TODO/FIXME/handlers vazios (scripts/audit) - fecha item 5 - Visao_V2
