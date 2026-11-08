# Mapa do repo e comandos — VISÃO V2

Ler ao começar uma tarefa neste repo. Regras curtas em `AGENTS.md`
(seções **Stack e comandos** e **Grafo de código**).

## 1. Onde olhar primeiro (nesta ordem)

| Fonte                                                                  | Para que serve                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `docs/estado/01-FRONTEND.md` … `09-VALIDACAO.md` + `_FATOS_RUNTIME.md` | **Auditoria com evidência arquivo:linha.** É a verdade sobre o que funciona e o que só existe. Comece aqui. |
| `ESTADO_ATUAL.md`                                                      | Veredito em uma tela + contagem honesta por dimensão                                                        |
| `FUNCIONALIDADES_COMPLETAS.md`                                         | Inventário de funcionalidades                                                                               |
| `docs/runbooks/`                                                       | Runbook por alerta (SLO burn, probe, Glacier, deploy freeze, Alertmanager)                                  |
| `graphify-out/`                                                        | Grafo de código, quando existir (§5)                                                                        |
| `docs/agentes/`                                                        | Este conjunto: banco, github-ci, deploy-infra, mediamtx-streaming, regras-dominio                           |

⚠️ `README.md`, `ARCHITECTURE.md` e a maioria dos ~175 arquivos em `docs/` são **históricos e
otimistas** (badges de "269 tests passing", "coverage 85%", contagens de arquivo desatualizadas).
Servem de contexto, **não** de evidência. Divergiu da realidade → corrija no mesmo PR do fix.

## 2. Estrutura

```
src/              83 páginas (src/pages), ~645 componentes, ~181 hooks, ~280 arquivos em lib/
                  + contexts, providers, stores, services, sdk, middleware, i18n, types
supabase/         functions/ (74 edges + _shared) · migrations/ (363 .sql) · seeds
scripts/          332 arquivos (≈37% órfãos) · scripts/ci/ · scripts/sql/
tests/            e2e/ (Playwright) · load/ (k6) · rls/
cypress/          suíte legada de e2e
e2e via Playwright: playwright.config.ts · unit: vitest.config.ts
docker/           stack do MediaMTX (ver mediamtx-streaming.md)
k8s/ observability/ agent/ workers/   (ver deploy-infra.md)
eslint-rules/     regras customizadas
reports/          saída de gates: bundle, deadcode, mobile-nav, qa-runs, quality-gates, simulations
```

## 3. Comandos

Gerente de pacote: **npm** (`npm ci --ignore-scripts`). `package-lock.json` e `bun.lock` coexistem e hoje
estão **fora de paridade** — ver `github-ci.md` §3.

```sh
npm run type-check:strict          # gate do CI e dos hooks (tsconfig.strict.json)
npm run format:check               # Prettier — gate do CI
npx vitest run <caminho>           # só o que você tocou
npm run test -- --run              # suíte unitária inteira
npm run test:smoke                 # páginas principais (Playwright, chromium)
npm run check:migrations           # RLS + GRANT + search_path + BEGIN/COMMIT + ROLLBACK
npm run check:env-contract         # nomes de VITE_* que o código realmente lê
npm run check:csp                  # allowlist de CSP
npm run check:mobile-nav           # mb-mobile-nav só no MainLayout
npm run check:page-content         # <PageContent> como wrapper raiz
npm run validate:fortress-shinobi  # bateria de gates de segurança (rtsp, vault, env, mediamtx, migrations)
npm run qa:gates                   # quality gates por perfil
npm run audit:deadcode:check       # dead code com baseline
node scripts/ci/check-agents-md-integrity.mjs   # guard destas instruções
```

Node: CI usa **22** (`pr-test-suite.yml:28`, `ci.yml`); `.nvmrc`/`.node-version` dizem `20.10.0` e
`app.yaml` diz `nodejs20`. Divergência conhecida — não "arrume" de passagem, é PR própria.

## 4. Automação nova

Script novo vai em `scripts/` (ou `scripts/ci/` se for gate), com entrada no `scripts/README.md`.
Nunca em `src/` nem em `supabase/`. Antes de criar, procure: são 332 arquivos, 74 `db:check:*` e
101 `simulate:*` — a chance de já existir equivalente é alta:

```sh
node -e 'const s=require("./package.json").scripts;console.log(Object.keys(s).join("\n"))' | grep <tema>
```

## 5. Grafo de código (graphify)

O grafo vive em `graphify-out/`. Quando `graphify-out/graph.json` existir, use-o **antes** de grep:

```sh
graphify query "<pergunta>"        # subgrafo escopado — muito menor que GRAPH_REPORT.md
graphify path "<A>" "<B>"          # relação entre dois símbolos
graphify explain "<conceito>"      # conceito focado
```

`graphify-out/GRAPH_REPORT.md` só para revisão ampla de arquitetura.
`graphify-out/wiki/index.md`, se existir, serve de navegação em vez de ler fonte crua.

**Confira a frescura antes de confiar:**

```sh
git rev-parse --short HEAD
grep "Built from commit" graphify-out/GRAPH_REPORT.md
```

Divergiu → o auto-sync via N8N costuma corrigir em até 15 min; para forçar,
`graphify update . --force`. Depois de alterar código, `graphify update .` (só AST, sem custo de API).
Em sessão de nuvem o grafo pode não existir ou estar velho — siga sem ele, não invente conteúdo dele.
No HEAD atual o report está defasado (`Built from commit: d0dc5472`) e `graph.json` não está versionado.

Hooks locais do Claude Code (`.claude/settings.json`) chamam `graphify hook-guard` antes de
`Bash|Grep|Read|Glob`; se o binário não existir no ambiente, o hook falha silenciosamente e você segue
com busca normal.

⚠️ O `graphify` sabe escrever uma seção `## graphify` no `CLAUDE.md` da raiz
(`.claude/skills/graphify/references/hooks.md:21-29`). Neste repo o `CLAUDE.md` é **só** `@AGENTS.md`:
se você vir conteúdo voltando pra lá, foi essa integração (ou o auto-sync via N8N) — mova para este
arquivo e deixe o `CLAUDE.md` com a linha única.

## 6. Convenções de código

Em `.claude/skills/visao-v2/SKILL.md` (espelhado em `.agents/skills/visao-v2/SKILL.md`): commits,
nomenclatura, onde ficam os testes. Regras de contribuição de issue/PR em `POSTING_RULES.md`.
