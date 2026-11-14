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

supabase/functions: 74 funcoes (admin-_, agent-_, camera-_, insightface-_, nvr-_, ptz-_, storage-tiering, watchdog*, public-api, upload-media, telegram, etc) + diretorio `_shared` (diretorio 75º, compartilhado, nao e uma funcao deployavel) + README.

### Migrations

supabase/migrations: 363 arquivos (consolidated, storage_buckets, notification_config + serie timestamped de cameras/analytics/ppe/facial/streaming/storage tiering).

### Workflows GitHub

.github/workflows: 46 arquivos (ci, test, lint, e2e-playwright, e2e, deploy, cd, pr-verify, knip, codeql, coverage, security, etc).

## 2. Cobertura do objetivo (OK / BLOQUEADO, com prova)

| #   | Item                             | Status        | Prova                                                                                                                                                                                                                                                           |
| --- | -------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Inventario                       | OK            | este arquivo + inventario/estado/rotas.json (89 urls/77 rotas/67 protegidas)                                                                                                                                                                                    |
| 2   | Cobertura                        | PARCIAL       | itens de codigo levantados; validacao no ar pendente (ver 7)                                                                                                                                                                                                    |
| 3   | Qualidade (build/lint/type/test) | PARCIAL       | build/type/unit success (CI run 43517330712); ESLint NAO VERIFICADO como gate — comentado no ci.yml:73-77 e com continue-on-error:true no lint.yml:34-36; run Lint 43517330819 verde mas nao atesta zero problemas. Knip run 43517330828 success (warning mode) |
| 3b  | E2E                              | BLOQUEADO     | run 43517330732 failure, exit 1, 252 passed, 124 failed, 7 flaky; causa = debito de infra (login/role + shards exigem Supabase vivo com usuario E2E + trigger on_auth_user_created_assign_role)                                                                 |
| 4   | Workflows main                   | BLOQUEADO (1) | todos os runs do push #184 verdes EXCETO Playwright E2E (43517330732) e o job "build" (43517330465, cancelled por concorrencia, nao falha real)                                                                                                                 |
| 5   | Sem pela metade                  | BLOQUEADO     | varredura exaustiva de TODO/FIXME/handlers vazios nao executada nesta sessao; 42 rotas sem menu = alerta, nao bug                                                                                                                                               |
| 6   | Banco RLS/seguranca              | BLOQUEADO     | sem acesso direto ao banco/CLI nesta sessao (so publishable/secret) - nao provo RLS/advisors/sync de migrations                                                                                                                                                 |
| 7   | Producao                         | BLOQUEADO     | deploy.yml (run 43517330736) so instala/typecheck/build/gera version.json — NAO publica no Vercel; publicacao e comportamento em producao NAO VERIFICADOS                                                                                                       |
| 8   | Entrega PRs                      | OK            | correcoes da sessao via PR + este relatorio                                                                                                                                                                                                                     |
| 9   | Relatorio                        | OK            | este arquivo                                                                                                                                                                                                                                                    |

## 3. Trabalho BLOQUEADO (causa exata)

- E2E (run 43517330732 exit 1): provisionar Supabase vivo (pmzxbffn) + usuario E2E + trigger de role. Sem isso nao fica verde.
- Banco RLS/advisors/sync: requer acesso direto (CLI/MCP supabase) indisponivel nesta sessao.
- TODO/FIXME/handlers vazios em codigo de producao: auditoria dedicada pendente.
- Publicacao no Vercel e logs de edge/banco pos-deploy #184: o workflow Deploy nao publica (so build); confirmar deployment Vercel no commit e inspecionar logs de producao.

## 4. Proximos passos (executiveis via MCP)

1. Provisionar Supabase vivo + secrets + usuario E2E + trigger de role - destrava o workflow vermelho (E2E) - infra + Visao_V2
2. Auditar RLS/seguranca/advisors do banco com acesso direto - fecha item 6 - Supabase pmzxbffn
3. Varrer TODO/FIXME/handlers vazios (scripts/audit) - fecha item 5 - Visao_V2
