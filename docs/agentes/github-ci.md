# GitHub e CI — VISÃO V2

Ler ao mexer em workflow, hook do husky, gate de qualidade, branch protection ou settings do repo.
Regras curtas em `AGENTS.md` (seção **Fluxo Git**).

## 1. Repo

- `adm01-debug/Visao_V2`, privado, branch padrão `main`. CODEOWNERS = `@adm01-debug` em tudo
  (`.github/CODEOWNERS`).
- Escrita: MCP **`GITHUB - MCP - FOREVER`**. O MCP padrão do GitHub devolve 403 em write neste org —
  use-o só para leitura (`list_pull_requests`, `get_file_contents`).
- `github_push_files` manda vários arquivos (`files` + `delete`) em **um** commit — prefira a ele vários
  `put_file`.

## 2. Branch protection da `main` (medido via API)

```
required_status_checks.strict = false
contexts = ["Unit (ubuntu-latest)", "Guardrails de banco (SECURITY DEFINER + RLS)"]
enforce_admins = true   allow_force_pushes = false   allow_deletions = false
required_conversation_resolution = true   required_pull_request_reviews = (não configurado)
```

Consequências práticas:

- Review humano **não** é exigido pelo GitHub — quem decide se mergeia é a regra do `AGENTS.md`, não o repo.
- `strict = false` (medido na API em 25/11): PR atrás da `main` não é bloqueada por estar desatualizada. Ainda assim, atualize a branch antes de mergear se houver conflito.
  **Nunca** desligue proteção para destravar merge.
- Os dois checks obrigatórios vêm de `.github/workflows/pr-test-suite.yml`
  (`:80` job `unit-tests`, `:287` job `db-guardrails`) e **ambos têm `if: draft == false`** — PR em draft
  não roda os checks e fica eternamente pendente. Para mergear, tire do draft.
- `db-guardrails` só executa de verdade se o secret `SUPABASE_DB_URL` existir; sem ele o job emite
  `::warning::` e **passa** (`pr-test-suite.yml:297-306`) — check verde aqui não prova RLS boa.
- `db-guardrails` roda `npm run db:check:all`, que inclui `db:check:cron-jobs`
  (`scripts/check-cron-jobs-commands.mjs`). Esse guard valida os 14 comandos do `pg_cron` **no estado real do
  banco** apontado por `SUPABASE_DB_URL`: ele reprova enquanto a migration
  `20261126221000_cron_edge_function_url_helpers.sql` não estiver aplicada ali. A ordem é aplicar a migration e
  só então mergear — desligar o guard ou apontar o secret para outro banco não resolve.
- Mudou o perímetro (checks, proteção, workflow) → atualize este arquivo na mesma PR.

## 3. Workflows (43 arquivos em `.github/workflows/`)

Medição da auditoria (`docs/estado/05-INFRA-CI.md`): **0 workflows protegem algo hoje**, 18 executariam um
gate real se a instalação de dependências funcionasse, 24 não protegeriam nada nem assim. Não confira
"tem workflow" como garantia — leia o YAML.

Os que importam:

| Workflow                                                    | O que faz de fato                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pr-test-suite.yml`                                         | Os dois checks obrigatórios + e2e + chaos + testes Deno das edges. Node 22.                                                                                                                                                      |
| `ci.yml`                                                    | Bateria longa em `push` na `main`/`develop` e PR: paridade de lockfile, `type-check:strict`, `check:migrations`, `format:check`, dead code, mobile-nav, page-content, CSP, skeletons, build, bundle size, smoke, `npm run test`. |
| `deploy.yml` / `cd.yml`                                     | **Só buildam.** Nenhum passo publica nada (ver `deploy-infra.md`).                                                                                                                                                               |
| `deploy-freeze-check.yml`                                   | Gate de freeze por SLO; label `deploy-freeze-override` faz bypass auditado.                                                                                                                                                      |
| `auto-merge.yml`                                            | Só escreve no step summary — **não** mergeia nada, apesar do nome.                                                                                                                                                               |
| `qa-console-full.yml`, `e2e-playwright.yml`, `security.yml` | Têm a service key no `env` e podem elevar a conta E2E a `admin` (`E2E_ALLOW_ADMIN_ROLE=1`). Em `e2e-playwright.yml` o job roda no ambiente `e2e` (ver §3.1).                                                                     |
| `ci.yml` / `test.yml` concurrency                           | Gates isolados: `ci-build-`/`ci-tests-` + `github.ref`, `cancel-in-progress: true`; risco de cancelamento cruzado eliminado (o grupo não unifica mais os dois workflows).                                                        |

### 3.1. Perímetro de segredos do Playwright E2E

`.github/workflows/e2e-playwright.yml:21` põe os shards no ambiente `e2e`, e o `env` do job injeta
`SUPABASE_SERVICE_ROLE_KEY` para elevar a conta E2E a `admin` (sem isso toda rota com `minRole` cai em
`/acesso-negado`). O ambiente `e2e` já existe no repo; hoje está **sem protection rules**, ou seja, o
`environment:` sozinho não restringe nada. Para que nenhuma branch arbitrária consuma a chave, adicione
required reviewers ou restrição de branch no ambiente. PRs de fork não recebem secrets.

### 3.2. Usuário E2E é compartilhado — não reescreva a senha

O usuário de `E2E_TEST_EMAIL` é o mesmo em todos os jobs do push. `PUT /auth/v1/admin/users/{id}` com
`password` **revoga todas as sessões** dele no GoTrue: quem escreve derruba a sessão de quem já está
rodando, e esses jobs caem em `/auth` (403 em `/auth/v1/user`) com páginas vazias. Em 26/11 um `522` do
GoTrue fez o setup do `qa-console-full` reescrever a senha e os dois shards do Playwright ficaram vermelhos.
Regra: `tests/e2e/global-setup.ts` só cria usuário novo com senha; `scripts/seed-e2e-user.mjs` só
reescreve quando o login de teste falha. Não adicione `password` em `PUT` de usuário existente sem essa
checagem.

### `npm ci` depende de paridade de lockfile

`ci.yml:38` roda `node scripts/check-lockfile-parity.mjs` **antes** do install, de propósito.
No HEAD atual ele **falha** (exit 1): `package.json` e `bun.lock` divergem em ~20 pacotes
(`@tanstack/react-query`, `vite`, `jsdom`, `zod`, …). Enquanto isso não for corrigido, o job `build` do
`ci.yml` morre no primeiro passo. Correção: `npm install --package-lock-only && bun install --lockfile-only`
em PR própria (`chore(deps):`) — e avise o dono, porque mexe em lockfile com fila de Dependabot aberta.

### ESLint está desligado no CI

`ci.yml:73-77`: o step de ESLint está comentado — `typescript-eslint` 8.x incompatível com a versão de TS
do repo. `npm run lint:ci` ainda existe e os hooks o rodam em modo não-bloqueante. Não "conserte" o lint
global sem pedido: são erros pré-existentes em ~67 arquivos legados.

## 4. Hooks locais (husky v9)

| Hook         | O que roda                                                            |
| ------------ | --------------------------------------------------------------------- |
| `commit-msg` | `commitlint --edit` → `commitlint.config.js`                          |
| `pre-commit` | `lint-staged` → `type-check:strict` → `lint:ci` (último não bloqueia) |
| `pre-push`   | `type-check:strict` → `lint:ci` (não bloqueia)                        |

`--no-verify` é saída de emergência, não rotina: o `type-check:strict` do hook é o mesmo gate do CI
(`ci.yml:53`). Se precisar pular, diga na PR por quê.

Atenção: há **três** configs de lint-staged no repo (`.lintstagedrc`, `.lintstagedrc.json`,
`lint-staged.config.js`) com conteúdo diferente, e dois de ESLint (`.eslintrc.cjs`, `eslint.config.js`).
Quem vence depende da ordem de resolução da ferramenta — não assuma, teste antes de confiar.

## 5. Convenção de commit (`commitlint.config.js`)

- `<tipo>(<escopo>): <assunto>` — Conventional Commits.
- Tipos permitidos: `feat fix docs style refactor perf test chore revert ci build`. **Não existe `infra`** —
  branch de infra usa `ci:` ou `chore:`.
- `subject-case: lower-case` (assunto em minúsculas), `subject-max-length: 100`.
- Mensagem em PT-BR, imperativo, sem ponto final.

Exemplo: `fix(db): aponta config.toml para o projeto oficial`

## 6. Fluxo de branch

1. Antes de começar: liste PRs abertas (`list_pull_requests`). PR aberta tocando os mesmos arquivos →
   pare e avise o dono. Hoje a fila tem 10 PRs do Dependabot, `#162` (Prettier na `main`, toca `CLAUDE.md`
   e `ESTADO_ATUAL.md`) e `#163` (segredos hardcoded).
2. Branch a partir de `main` atualizado: `claude/<fix|feat|chore|ci>-<slug>-<AAMMDD-HHMM>`.
   Uma tarefa = uma branch = uma PR.
3. Antes de cada push: `git log -1 --format='%an %s'` — se o último commit não é seu, pare.
4. PR sempre, mesmo de 1 linha. Título = o que muda; corpo = causa + evidência do que foi verificado.
5. Merge: squash + apagar a branch. Deixe aberta e chame o dono nos casos da seção **Fluxo Git** do `AGENTS.md`.
6. Conflito: rebase na `main` e `--force-with-lease` **só** na sua branch. Nunca force-push na `main`,
   nunca rebase/commit/merge em branch alheia.

### Isolamento por worktree (perfil Hermes)

Quando vários agentes trabalham no mesmo clone, crie worktree em vez de trocar de branch no diretório
compartilhado:

```sh
BRANCH="claude/fix-<slug>-$(date +%y%m%d-%H%M)"
WORKSPACE="$HOME/hermes-workspaces/${BRANCH##*/}"
git worktree add "$WORKSPACE" -b "$BRANCH" && cd "$WORKSPACE"
[ "$(git branch --show-current)" = "$BRANCH" ] || exit 1
# ... trabalhar, commit, push, PR ...
git worktree remove "$WORKSPACE" --force && git worktree prune
```

Em sessão de nuvem com clone próprio isso é desnecessário — a branch já é exclusiva da sessão.

## 7. Guard das instruções de agente (GA02)

`scripts/ci/check-agents-md-integrity.mjs` existe para que uma sessão paralela não apague nem esvazie as
instruções. Ele falha se: `AGENTS.md` não existir; faltar uma das 8 seções obrigatórias
(`## Postura`, `## Bugs e funcionalidades`, `## Comunicação`, `## Fluxo Git`, `## Banco`, `## Serviços`,
`## Stack e comandos`, `## Grafo de código`) como linha real (não substring solta em outra seção) com
corpo não-trivial abaixo (mínimo 80 bytes antes do próximo `## `); o conjunto `AGENTS.md` + `CLAUDE.md` +
`docs/agentes/*.md` encolher mais de 30% em bytes contra a base; ou algum arquivo vigiado sumir/encolher
mais de 50%.

Roda em `ci.yml` como 3º step (depois de Checkout e Setup Node.js, antes de Lockfile parity e `npm ci`),
com `AGENTS_MD_BASE=FETCH_HEAD` apontando para a `main`.
Local: `node scripts/ci/check-agents-md-integrity.mjs` (compara com o `HEAD`).
Se você está **intencionalmente** encurtando as instruções, o gate vai barrar — avise na PR e o dono decide.
