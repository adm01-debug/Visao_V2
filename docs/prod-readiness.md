# Visao_V2 - Prod Readiness Report

Base: main @ 77a6f0526b (== origin/main) | branch: claude/docs-prod-readiness-261114-1600 | gerado em 2026-11-14 16:00

## 1. Inventario funcional (linha de base "sem perda de funcionalidade")

Levantado do codigo do main atual (77a6f0526b).

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

## 2. Integracoes desta sessao (PRs abertas de agentes/dependabot -> main)

| PR | Titulo | Resultado | Evidencia (commit squash na main) |
| -- | ------ | --------- | --------------------------------- |
| 188 | fix(e2e): spec mobile-nav-class p/ rotas standalone e redirect async | mergeado | 2fa4a234 |
| 189 | fix(e2e): h1 duplicado do PageTitle + heading People | mergeado | 73746f64 |
| 190 | fix(e2e): estabiliza snapshot useFrameBuffer (React #185) | mergeado | cbca4c27 |
| 181 | chore(deps): routine group (4 updates) | mergeado | 3a6eff91 |
| 177 | chore(deps-dev): tailwindcss 4.3.4 -> 4.3.5 | mergeado | 40e9b93c |
| 191 | fix: remove BOM de package.json e bun.lock (quebra JSON na CI) | mergeado | 77a6f052 |

## 3. Cobertura do objetivo (OK / PARCIAL / BLOQUEADO, com prova)

| #   | Item                             | Status        | Prova |
| --- | -------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Inventario                       | OK            | este arquivo + inventario/estado/rotas.json (89 urls/77 rotas/67 protegidas)                                    |
| 2   | Integracao de PRs agentes        | OK            | 6 PRs integradas nesta sessao (tabela acima), zero PR aberta (`gh pr list` vazio)                               |
| 3   | CI na main (unit/build/type)     | OK            | test.yml 43593213029 success (Unit/Lint/Security) e ci.yml build success em 3a6eff91/2fa4a234; job cancelado em alguns commits = concorrencia de grupo (ci.yml vs test.yml usam mesmo concurrency `ci-${{ github.ref }}`), nao falha real. Deploy.yml 43593212817 success no 77a6f052 |
| 3b  | E2E (Playwright)                 | PARCIAL       | run 43593212738 (77a6f052) CANCELADO apos 3,5h sem log (step "Run Playwright E2E with auth seed" pendurado - runner sem heartbeat). Run anterior 43591629407 (40e9b93c) falhou por BOM no package.json — ja corrigido pela PR 191. Resta debito de infra E2E (ver bloqueio D) |
| 4   | Workflows main                   | PARCIAL       | no commit 77a6f052: 27 runs concluidos com sucesso (lint, knip, codeql, security, coverage, deploy, cd, bundle-size, size, lighthouse, performance, axe, chromatic, dependency-audit, semantic-release, visual-regression etc); 1 cancelado (E2E travado, ver 3b); espera-se demora do E2E-playwright (nao requerido p/ merge) |
| 5   | Sem pela metade                  | BLOQUEADO     | varredura exaustiva de TODO/FIXME/handlers vazios nao executada nesta sessao; 42 rotas sem menu = alerta, nao bug. Acao: scripts/audit dedicada |
| 6   | Banco RLS/seguranca              | BLOQUEADO     | sem acesso direto ao banco/CLI nesta sessao (so publishable/secret) - nao provo RLS/advisors/sync de migrations |
| 7   | Producao (Vercel)                | OK (deploy) / BLOQUEADO (validacao de logs) | Vercel API: deploy READY dpl_JDb2iD = commit 77a6f052 (alias visao-v2-juca1.vercel.app e visao-v2-kappa.vercel.app). Deploys com ERROR (11:46/12:30, 40e9b93c) foram o BOM — corrigido. CDN ativa p/ alias. Edge/banco em producao NAO re-inspecionados nesta sessao |
| 8   | Qualidade de codigo (lint/type)  | PARCIAL       | ESLint NAO VERIFICADO como gate — comentado no ci.yml:73-77 e continue-on-error:true no lint.yml:34-36. Test.yml (Lint & Type Check) green. Knip success (warning mode) |
| 9   | Relatorio                        | OK            | este arquivo |

## 4. Trabalho BLOQUEADO (causa exata)

- A. E2E completo: verificacao de que login/role funciona em CI. Etapas: re-rodar o workflow apos o fix de BOM e confirmar o run nao pendura (3,5h sem log = provavel runner/CRON preso, nao codigo). Se pendurar de novo, investigar: o step "auth seed" espera resposta do Supabase vivo (pmzxbffn) — confirme user E2E + trigger de role (on_auth_user_created_assign_role).
- B. Banco RLS/advisors/sync: requer acesso direto (CLI/MCP supabase) indisponivel nesta sessao.
- C. TODO/FIXME/handlers vazios em codigo de producao: auditoria dedicada pendente (scripts/audit).
- D. Publicacao Vercel confirmada (deploy READY no commit da main) mas logs de edge function / banco em producao nao inspecionados.

## 5. Proximos passos (executiveis via MCP)

1. Re-rodar o E2E no head atual (77a6f052) e acompanhar ate o fim — era o run que pendurou 3,5h sem log; a falha anterior (BOM) ja esta corrigida. - destrava o ultimo workflow vermelho/cancelado - Visao_V2
2. Provisionar no Supabase vivo o usuario E2E + trigger de role se o passo "auth seed" falhar de novo - fecha o bloqueio A - Supabase pmzxbffn
3. Varrer TODO/FIXME/handlers vazios com scripts/audit - fecha item 5 - Visao_V2
