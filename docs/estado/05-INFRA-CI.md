# 05 — INFRAESTRUTURA E CI/CD

> Auditoria de `.github/`, `scripts/`, `Dockerfile`, `docker/`, `docker-compose*.yml`, `k8s/`,
> `nginx.conf`, `observability/` e arquivos de plataforma na raiz.
> **Método:** medição direta sobre os arquivos versionados. Nenhum build, lint ou teste foi
> executado localmente (`node_modules` ausente — ver `_FATOS_RUNTIME.md`).
> **Exceção documentada:** o coordenador da auditoria abriu o **PR real #88** neste repositório,
> com um diff de apenas 2 arquivos `.md` em `docs/estado/`, e observou as execuções reais dos
> workflows. Os resultados dessa observação estão em **§0** e são a única evidência de runtime
> de CI deste documento — o restante é análise estática.
> Toda linha cita `arquivo:linha` ou nome de workflow. Sem evidência → 🟦.

---

## Contagens

### Workflows — denominador 45

| Classe                                                                 |    Qtd |   % |
| ---------------------------------------------------------------------- | -----: | --: |
| ✅ IMPLEMENTADO_TOTAL — existe, dispara e protege algo                 |  **6** | 14% |
| 🟨 PARCIAL — dispara, mas o gate é furado, condicional ou não bloqueia | **12** | 29% |
| 🟦 SUGERIDO_OU_INICIADO                                                |  **0** |  0% |
| ⬛ MORTO — não faz o que o nome promete                                | **24** | 57% |

> ⚠️ **A tabela acima é a classificação por leitura do YAML. A classificação EFETIVA é pior.**
> Como demonstrado em **§0**, `npm ci` aborta em todo runner Linux por uma regressão de
> `package.json`/`package-lock.json`. Todo workflow que instala dependências morre na instalação,
> **antes de executar qualquer verificação**. Classificação efetiva medida no PR #88:

| Classe efetiva                                          |    Qtd |   % |
| ------------------------------------------------------- | -----: | --: |
| ✅ Protege algo hoje                                    |  **0** |  0% |
| 🟨 Executaria um gate real se a instalação funcionasse  | **18** | 43% |
| ⬛ Não protegeria nada nem com a instalação funcionando | **24** | 57% |

### Scripts — denominador 333 arquivos medidos

> ⚠️ O escopo da tarefa citava 319 arquivos. A medição real em `scripts/` é **333 arquivos**
> (`find scripts -type f | wc -l`), **60.281 linhas** somando `.mjs/.ts/.sh/.js/.cjs`.
> Distribuição: 258 `.mjs`, 55 `.ts`, 13 `.sh`, 3 `.py`, 1 `.sql`, 1 `.json`, 1 `.js`, 1 `.md`.

| Classe                                                                                      |     Qtd |   % |
| ------------------------------------------------------------------------------------------- | ------: | --: |
| ✅ Alcançável por um workflow ou hook (fecho transitivo de `npm run`, inclusive `prebuild`) | **107** | 32% |
| 🟦 Declarado em `package.json` mas fora de qualquer caminho de CI/hook                      | **104** | 31% |
| ⬛ Órfão absoluto — nenhum `package.json`, workflow, hook, Makefile ou outro script o cita  | **122** | 37% |

### Alvos de deploy

| Classe                                               |   Qtd |
| ---------------------------------------------------- | ----: |
| Alvos de plataforma declarados por arquivo de config | **8** |
| Alvos com workflow que efetivamente faz deploy       | **0** |

---

## 0. PROVA EMPÍRICA — PR real #88 (diff de 2 arquivos `.md`)

Fonte: o coordenador abriu o PR #88 em `adm01-debug/vis-o-v2` contendo **exclusivamente** dois
arquivos Markdown novos em `docs/estado/`. Nenhum código, nenhum lockfile tocado. Os achados
abaixo são **observação de execução real**, não inferência — e foram reconferidos contra os
arquivos deste repositório.

### 0.1 🔴 `npm ci` está quebrado na base — nenhum gate do CI chega a executar

**Causa-raiz, medida:**

| Evidência                     | Conteúdo                                                                                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json:352`            | `"@swc/core-win32-x64-msvc": "1.15.47"` — declarado no bloco **`dependencies`**                                                                                                                                  |
| Verificação                   | `"@swc/core-win32-x64-msvc" in package.json.dependencies` → **`true`**; em `devDependencies` → `false`; em `optionalDependencies` → `false`. O `package.json` **não tem** bloco `optionalDependencies` (`null`). |
| Único do tipo                 | É o **único** binário nativo específico de plataforma em todo o `dependencies` do root (`Object.keys(dependencies).filter(/win32\|darwin\|linux-\|msvc/)` → 1 resultado)                                         |
| `package-lock.json:24`        | O pacote aparece na lista de `dependencies` do pacote root (`packages[""]`)                                                                                                                                      |
| `package-lock.json:6861-6875` | `node_modules/@swc/core-win32-x64-msvc` v1.15.47, com `"cpu": ["x64"]` e `"os": ["win32"]`, **sem `"optional": true`** e **sem `"dev": true`**                                                                   |

**Contraprova que isola a regressão** — a entrada _aninhada_ do mesmo pacote está correta:

| `package-lock.json:6876-6890` | `node_modules/@swc/core/node_modules/@swc/core-win32-x64-msvc` v1.15.46 |
| ----------------------------- | ----------------------------------------------------------------------- |
| `:6883`                       | `"dev": true` ✅                                                        |
| `:6885`                       | `"optional": true` ✅                                                   |
| `:6886-6888`                  | `"os": ["win32"]`                                                       |

E `package-lock.json:6656-6668` mostra que `@swc/core` declara todos os 12 binários de
plataforma — inclusive `@swc/core-win32-x64-msvc: "1.15.46"` — corretamente dentro de
**`optionalDependencies`**. Ou seja: o mecanismo padrão do SWC funciona. O que quebrou foi
alguém **promover manualmente** o binário Windows a dependência de runtime de primeiro nível
no `package.json` do projeto, o que faz o npm gerar uma entrada de lock obrigatória.

**Erro observado em runner Linux:**

```
npm error code EBADPLATFORM
npm error notsup Unsupported platform for @swc/core-win32-x64-msvc@1.15.47:
              wanted {"os":"win32"} (current: {"os":"linux"})
```

**É pré-existente, não introduzido pelo PR.** Confirmado por
`git show main:package.json | grep -c core-win32-x64-msvc` → **1** e
`git show main:package-lock.json | grep -c core-win32-x64-msvc` → **6**. O PR #88 não altera
nenhum dos dois arquivos.

**Consequência medida no PR #88** — falharam, todos pela mesma causa (morte na instalação):

`build`, `ESLint (--max-warnings=0)`, `ESLint --fix`, `coverage`, `axe`,
`verify (node 20 / bun 1.2.0)`, `verify (node 22 / bun latest)`, `preview`,
`Playwright E2E shard 1/2`, `Playwright E2E shard 2/2`, `Merge Playwright reports`,
`Detect dead code`.

Todos os 40 workflows que rodam `npm ci`, `npm install` ou `bun install` estão nesta condição.
Os 2 que escapam (`terraform.yml`, `rollback.yml`) não instalam nada porque não fazem nada.

> **Implicação para toda a classificação deste documento:** um gate que nunca chega a executar
> não protege nada. As 13 barreiras de `ci.yml:40-124`, os 74 gates `db:check:*`, o
> `suite-gate` de `pr-test-suite.yml:364-431`, os shards Playwright — **nenhum executa hoje**.
> Eles reportam vermelho por falha de _setup_, não por qualidade do código. O vermelho é
> indistinguível de um vermelho legítimo, e por isso perde todo o valor de sinal.

> **Implicação para merges:** o repositório **não consegue ter CI verde hoje**. Se existir
> regra de branch protection exigindo qualquer um desses checks, `main` está travada e todo
> merge só pode acontecer por bypass administrativo. Se **não** existir, os checks vermelhos
> são cosméticos e merges acontecem sem qualquer verificação. **Qual dos dois cenários é o
> real: NAO_VERIFICADO** — exige
> `gh api repos/adm01-debug/vis-o-v2/branches/main/protection`.
> Ambos os cenários são graves; o segundo é o mais provável, dado que
> `git log --oneline -5` mostra merges recentes em `main` (`5378651 merge: master para main`).

Nota lateral: `pr-verify.yml` e `e2e-playwright.yml` usam `bun install --frozen-lockfile`
(`pr-verify.yml:60`, `e2e-playwright.yml:54`) sobre `bun.lock`, não `package-lock.json` — e
ainda assim falharam, o que indica que `bun.lock` carrega a mesma entrada obrigatória. Não foi
possível confirmar por leitura (arquivo de 656 KB em formato binário-textual). **NAO_VERIFICADO.**

### 0.2 🔴 Ausência total de filtro de caminho — 22 checks para um PR de 2 `.md`

Medição estática sobre os 45 workflows:

| Métrica                                      |                                                                              Valor |
| -------------------------------------------- | ---------------------------------------------------------------------------------: |
| Workflows que declaram `paths:`              | **3** (`docker-security.yml:6,9`; `qa-console-full.yml:12-17`; `drift-schema.yml`) |
| Workflows que declaram `paths-ignore:`       |                                                                              **0** |
| Workflows **sem qualquer filtro de caminho** |                                                             **42** de 45 (**93%**) |

Observação real no PR #88 (diff = 2 arquivos `.md` em `docs/estado/`): **22 check runs
disparados**, incluindo Playwright E2E (2 shards), axe-core, coverage, dependency-review,
`slo/deploy-freeze`, preview e auto-merge.

Ironia medida: os **únicos** três workflows com filtro de caminho se comportaram corretamente.
`docker-security.yml` não disparou (nenhum `Dockerfile`/`docker-compose*.yml` no diff) e
`qa-console-full.yml` não disparou (`paths:` restrito a `src/**`, `tests/e2e/**`,
`scripts/build-qa-console-report.mjs`, `.github/workflows/qa-console-full.yml`, `package.json`).
Os dois workflows que a §3.9 classifica como ⬛/✅ por outros motivos são os únicos dois que
acertaram o `on:`.

O custo é duplo: minutos de runner desperdiçados em toda alteração de documentação, e — mais
grave — **ruído que treina o time a ignorar checks vermelhos**, exatamente o mecanismo que
esconde a falha de §0.1.

### 0.3 🔴 Confirmação empírica da colisão de concorrência (§3.1)

Observado no PR #88: os jobs **`Unit Tests`**, **`Lint & Type Check`** e **`Security Audit`**
terminaram como **`cancelled` em 1 segundo**.

Esses são exatamente, e apenas, os três `name:` de jobs de `test.yml`:

| Job                 | Evidência                                 |
| ------------------- | ----------------------------------------- |
| `Lint & Type Check` | `test.yml:16` — `name: Lint & Type Check` |
| `Unit Tests`        | `test.yml:32` — `name: Unit Tests`        |
| `Security Audit`    | `test.yml:50` — `name: Security Audit`    |

Cancelamento em 1 segundo, nos três jobs do mesmo workflow, é a assinatura de
`cancel-in-progress` atuando sobre o workflow inteiro no momento da entrada na fila.
**Isto confirma empiricamente a hipótese de §3.1:** `ci.yml:11` e `test.yml:11` declaram o
mesmo `group: ci-${{ github.ref }}` com `cancel-in-progress: true`, grupos de concorrência são
de escopo repositório, e o segundo a entrar cancela o primeiro. `test.yml` inteiro foi
descartado sem executar nada.

Consequência: dos dois workflows chamados "CI", **um é sistematicamente aniquilado**. E o
resultado publicado é `cancelled` — que na UI do GitHub é cinza, não vermelho, e em muitas
configurações de branch protection **não conta como falha**.

### 0.4 🔴 PR em rascunho = suíte inteira verde por omissão

Observado no PR #88: jobs **`skipped`** com o nome **não interpolado** —
`E2E (${{ matrix.os }})` e `Unit (${{ matrix.os }})`.

Nome não interpolado é o que o GitHub exibe quando um job de matriz é pulado antes da
resolução da matriz. A causa está no YAML:

| Job                                      | Evidência               | Condição                                       |
| ---------------------------------------- | ----------------------- | ---------------------------------------------- |
| `static-analysis`                        | `pr-test-suite.yml:38`  | `if: github.event.pull_request.draft == false` |
| `unit-tests` (`Unit (${{ matrix.os }})`) | `pr-test-suite.yml:81`  | idem                                           |
| `e2e-tests` (`E2E (${{ matrix.os }})`)   | `pr-test-suite.yml:194` | idem                                           |
| `db-guardrails`                          | `pr-test-suite.yml:288` | idem                                           |
| `suite-gate`                             | `pr-test-suite.yml:366` | `if: always()` — **sempre roda**               |

E o agregador trata rascunho como aprovação:

```bash
# pr-test-suite.yml:388-391
if [ "$IS_DRAFT" = "true" ]; then
  echo "ℹ️ PR em rascunho — suíte pulada intencionalmente." >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi
```

Ou seja: **em PR marcado como rascunho, os 4 jobs são pulados e o check agregador
`Suíte completa aprovada` termina verde.** É o padrão canônico de "check obrigatório que passa
por nunca executar".

Há uma ironia estrutural aqui: `pr-test-suite.yml:401-407` gasta 7 linhas de comentário
explicando que `skipped` **deve** bloquear o merge — _"'skipped' também falha para impedir que
um smoke desligado por engano libere o merge"_ — e a checagem imediatamente acima (`:388-391`)
concede exatamente essa isenção para o PR inteiro. A defesa foi construída e depois contornada
no mesmo arquivo.

O comportamento é declarado ("pulada intencionalmente"), o que o torna 🟨 e não fraude. Mas
combinado com §0.5 vira risco real.

### 0.5 🔴 `auto-merge` enfileirado em PR rascunho, sem gate efetivo

Observado no PR #88 (**em rascunho**): o job `auto-merge` foi **enfileirado**.

Confirmação no YAML:

```yaml
# auto-merge.yml:2-3
on:
  pull_request_target: # SEM filtro de `types:`
```

Sem `types:`, o `pull_request_target` usa o default `[opened, synchronize, reopened]` — que
**inclui PRs em rascunho**. Não há `if:` em nenhum nível do arquivo (`auto-merge.yml` tem 14
linhas, sem condicionais). O workflow dispara em todo PR, rascunho ou não.

Composição do risco, com as três peças medidas:

1. `auto-merge.yml:8-9` concede `contents: write` + `pull-requests: write`.
2. `dependabot.yml:13-15` aplica a label `automerge` em **todos** os PRs do Dependabot
   (`open-pull-requests-limit: 20`, semanal).
3. Os gates que deveriam preceder um merge automático **não executam** (§0.1) ou passam por
   omissão (§0.4).

**Estado atual:** o corpo de `auto-merge.yml:11-14` é um `actions/checkout` seguido de um
`echo` — ele **não faz merge de nada**, e por isso o risco hoje é potencial, não realizado.
Mas o arquivo tem nome, permissões e trigger de um auto-merge; existe uma label `automerge`
sendo produzida em escala esperando por ele; e o dia em que alguém "completar" esse workflow,
ele fará merge automático num repositório onde nenhuma verificação de qualidade funciona.

Agravante de superfície: `pull_request_target` roda em contexto privilegiado (com secrets e
token de escrita) e o workflow faz `actions/checkout@v4` (`auto-merge.yml:11`). Sem `ref:`
explícito, o checkout traz a base — o que evita o padrão clássico de execução de código do
fork. A configuração atual é defensável; qualquer edição futura que adicione
`ref: ${{ github.event.pull_request.head.sha }}` a transforma em execução de código não
confiável com `contents: write`. Mesmo padrão de trigger em `labeler.yml:2`.

---

## 1. O achado central: **nenhum dos 45 workflows faz deploy**

Busca exaustiva por qualquer comando ou action de deploy nos 45 workflows:

```
grep -rniE "vercel|netlify|flyctl|fly deploy|railway|render\.com|heroku|kubectl|helm|
            docker push|docker build|aws |gcloud|wrangler|supabase (db push|functions deploy)|
            rsync|scp " .github/workflows/
→ NENHUM RESULTADO
```

Inventário completo de `uses:` nos 45 workflows (19 actions distintas): `actions/checkout`,
`actions/setup-node`, `actions/upload-artifact`, `actions/cache`, `oven-sh/setup-bun`,
`actions/github-script`, `softprops/action-gh-release`, `peter-evans/find-comment`,
`peter-evans/create-or-update-comment`, `marocchino/sticky-pull-request-comment`,
`github/codeql-action/{init,autobuild,analyze}`, `denoland/setup-deno`,
`dawidd6/action-download-artifact`, `actions/stale`, `actions/labeler`,
`actions/download-artifact`, `actions/dependency-review-action`.
**Nenhuma action de deploy de nenhuma plataforma.**

Os seis workflows que _se chamam_ de deploy constroem e imprimem texto:

| Workflow            | Trigger                      | O que realmente faz                                                                                                                                                                            | Classe |
| ------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `deploy.yml`        | `push:[main]`, dispatch      | `npm ci` → `type-check:strict` → `npm run build` → `generate-version-json.mjs` → `echo '## ✅ Deploy completed'` (`deploy.yml:23-31`). Nenhum artefato é publicado nem enviado a lugar nenhum. | 🟨     |
| `cd.yml`            | `push:[main]`, dispatch      | `npm install ... \|\| true` + `npm run build \|\| true`, ambos com `continue-on-error: true` → `echo '## ✅ Continuous Deployment completed'` (`cd.yml:20-25`).                                | ⬛     |
| `blue-green.yml`    | só `workflow_dispatch`       | `npm ci` + `npm run build \|\| true` → `echo "✅ Build ready for ${{ inputs.environment }}"` (`blue-green.yml:34-45`). Não existe blue nem green.                                              | ⬛     |
| `canary-deploy.yml` | só `workflow_dispatch`       | idem, 17 linhas (`canary-deploy.yml:13-17`).                                                                                                                                                   | ⬛     |
| `k8s-deploy.yml`    | só `workflow_dispatch`       | `npm ci` + build → `echo "✅ Build ready for K8s deployment"` (`k8s-deploy.yml:30-40`). Nenhum `kubectl apply`, apesar de `k8s/` conter 6 manifests válidos.                                   | ⬛     |
| `preview.yml`       | `pull_request`               | `npm ci` + `npm run build \|\| true` → `echo "✅ Preview ready"` (`preview.yml:15-19`). Não gera URL de preview.                                                                               | ⬛     |
| `rollback.yml`      | `workflow_dispatch(version)` | `actions/checkout` com `ref: ${{ inputs.version }}` → `echo "Rolling back to: ..."` (`rollback.yml:12-17`). Faz checkout e nada mais.                                                          | ⬛     |

**Conclusão:** o deploy real de produção **não passa por este repositório**. A evidência
circunstancial aponta para a plataforma Lovable — `.lovable/plan.md` + `.lovable/memory/`
versionados, dependência `lovable-tagger` em `knip.json:41`, e `https://ai.gateway.lovable.dev`
na allowlist de CSP em `nginx.conf:32`. **NAO_VERIFICADO** — não é possível confirmar o pipeline
de deploy real a partir do repositório.

---

## 2. Alvos de deploy fantasma

Oito arquivos de configuração de plataforma na raiz. Nenhum tem workflow, e vários são
mutuamente contraditórios sobre o runtime.

| Arquivo           | Conteúdo                                                                   | Runtime que assume | Workflow? | Classe |
| ----------------- | -------------------------------------------------------------------------- | ------------------ | --------- | ------ |
| `vercel.json`     | `buildCommand: npm run build`, `outputDirectory: dist`, rewrite SPA        | estático           | não       | 🟦     |
| `netlify.toml`    | `command = "npm run build"`, `publish = "dist"`, redirect 200              | estático           | não       | 🟦     |
| `render.yaml`     | `env: static`, `buildCommand: npm ci && npm run build`                     | estático           | não       | 🟦     |
| `cloudflare.json` | `pages_build_output_dir: ./dist`                                           | estático (Pages)   | não       | 🟦     |
| `app.yaml`        | `runtime: nodejs20` + `static_files: dist/index.html` (GAE)                | **Node 20**        | não       | ⬛     |
| `fly.toml`        | `app = "visao"`, `[build] dockerfile = "Dockerfile"`, `internal_port = 80` | container nginx    | não       | 🟦     |
| `heroku.yml`      | `build.docker.web: Dockerfile` + `run.web: npm run preview`                | **contraditório**  | não       | ⬛     |
| `Procfile`        | `web: npm run preview -- --host 0.0.0.0 --port $PORT`                      | servidor Vite      | não       | ⬛     |
| `railway.json`    | `builder: NIXPACKS`, `startCommand: npm run preview`                       | servidor Vite      | não       | ⬛     |

Contradições materiais medidas:

- **`heroku.yml:2-5`** manda buildar o `Dockerfile` (que produz uma imagem **nginx** servindo
  `/usr/share/nginx/html` na porta 80, `Dockerfile:35-54`) e depois rodar `npm run preview`
  dentro dela. `npm run preview` = `vite preview` (`package.json`, script `preview`), que não
  existe na imagem final — o estágio `production` é `nginx:alpine` sem Node nem `node_modules`.
  **Esta configuração não pode funcionar.**
- **`Procfile` e `railway.json:4`** rodam `vite preview` em produção. `vite preview` é um
  servidor de inspeção de build, não um servidor de produção.
- **`app.yaml:1`** declara `runtime: nodejs20`; todos os 45 workflows usam Node 22
  (`node-version: '22'` em 40 ocorrências de `actions/setup-node`); `.nvmrc` e `.node-version`
  precisam ser conferidos contra isso.
- **`fly.toml:9-11`** com `min_machines_running = 0` + `auto_stop_machines` — perfil de app
  que hiberna, incompatível com o sistema de vigilância 24/7 descrito no repositório.

`k8s/` (6 manifests: `deployment.yaml`, `service.yaml`, `ingress.yaml`, `hpa.yaml`,
`configmap.yaml`, `secrets.yaml`) é o conjunto mais bem-feito do repositório — `securityContext`
com `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]`,
probes em `/health`, `podAntiAffinity` (`k8s/deployment.yaml:20-82`) — e **nunca é aplicado
por nada**. `k8s/ingress.yaml:14-18` aponta para `vis-o.app` / `www.vis-o.app`;
`k8s/deployment.yaml:30` usa `image: vis-o:latest`, imagem que nenhum workflow constrói nem
publica. Classe: 🟦 (bem-formado, sem evidência de uso).

---

## 3. CI que mente — achados por categoria

### 3.1 ⚠️ CRÍTICO — dois workflows chamados "CI" cancelam um ao outro

> ✅ **CONFIRMADO EMPIRICAMENTE** no PR #88 — ver §0.3. Os três jobs de `test.yml`
> (`Lint & Type Check`, `Unit Tests`, `Security Audit`) terminaram `cancelled` em 1 segundo.
> A análise abaixo é a derivação estática que a observação confirmou.

| Evidência        | Valor                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------- |
| `ci.yml:1`       | `name: CI`                                                                            |
| `test.yml:1`     | `name: CI`                                                                            |
| `ci.yml:10-12`   | `concurrency: group: ci-${{ github.ref }}` / `cancel-in-progress: true`               |
| `test.yml:10-12` | `concurrency: group: ci-${{ github.ref }}` / `cancel-in-progress: true`               |
| `ci.yml:3-8`     | `on: push:[main,develop]`, `pull_request:[main]`, `workflow_dispatch`                 |
| `test.yml:3-8`   | `on: push:[main,develop]`, `pull_request:[main]`, `workflow_dispatch` — **idênticos** |

Grupos de concorrência no GitHub Actions são de escopo **repositório**, não de escopo workflow.
Dois workflows diferentes que declaram o mesmo `group` com `cancel-in-progress: true` **se
cancelam mutuamente**. Como os dois disparam nos mesmos eventos, em todo push para `main` e em
todo PR para `main` os dois entram na fila do mesmo grupo e um dos dois é cancelado.

Consequência prática (confirmada em §0.3 — foi `test.yml` que morreu): `ci.yml` é o pipeline pesado (128 linhas, 13 gates bloqueantes: strict
type-check, lint de migrations, Prettier, dead code, mobile-nav, page-content, CSP, skeletons,
build, bundle-size, 5 suítes Playwright, vitest — `ci.yml:40-124`). `test.yml` é raso
(62 linhas: `tsc --noEmit` + `npm run lint` com `continue-on-error` + vitest + `npm audit ... || true`).
**Um dos dois nunca completa, e não é determinístico qual.** Se `test.yml` (mais rápido) inicia
depois, cancela `ci.yml` inteiro — e no painel de checks o nome "CI" continua aparecendo, verde.

Agravante: como os dois se chamam `CI`, os status checks publicados colidem no espaço de nomes
(`CI / build` de `ci.yml` vs `CI / Lint & Type Check`, `CI / Unit Tests`, `CI / Security Audit`
de `test.yml`). Não é possível saber qual está configurado como _required_ na proteção de branch
— **NAO_VERIFICADO**, exige leitura das branch protection rules no GitHub.

### 3.2 Gates obrigatórios anulados por `continue-on-error: true`

27 dos 45 workflows contêm ao menos um `continue-on-error: true`. Os casos em que isso anula
o próprio propósito do workflow:

| Workflow:linha             | Step neutralizado                                                | Efeito                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lint.yml:35-36`           | `continue-on-error: true` no **único** step (`npm run lint:ci`)  | O workflow chamado "Lint / ESLint (--max-warnings=0)" **nunca reprova**. O check fica verde com qualquer quantidade de erros. ⬛                                                                                                                                                                       |
| `codeql.yml:27,31,35`      | `init`, `autobuild` **e** `analyze` — os três                    | CodeQL nunca bloqueia; se a análise falhar inteira, o job ainda termina verde e imprime `## ✅ CodeQL analysis completed` (`codeql.yml:37-38`).                                                                                                                                                        |
| `dependency-review.yml:12` | o único step (`actions/dependency-review-action@v4`)             | Dependência com CVE conhecido nunca reprova o PR. ⬛                                                                                                                                                                                                                                                   |
| `pr-verify.yml:76-77`      | `bun run lint`                                                   | Lint desligado no gate de PR.                                                                                                                                                                                                                                                                          |
| `pr-verify.yml:82-83`      | `bun run test:unit`                                              | Ver 3.3 — o comando está quebrado _e_ silenciado.                                                                                                                                                                                                                                                      |
| `ci.yml:98,104`            | `test:mobile-nav-overlap`, `test:mobile-nav-visual`              | Regressão visual não bloqueia.                                                                                                                                                                                                                                                                         |
| `a11y-axe.yml:29`          | `npx playwright test tests/e2e/a11y-axe-critical-routes.spec.ts` | O teste axe-core de rotas críticas **nunca reprova**; a linha 41 imprime `## ✅ Axe-core a11y check completed` independentemente do resultado.                                                                                                                                                         |
| `knip.yml:49,73,115`       | run knip, compare baseline, knip na base                         | Declarado explicitamente "warning mode" (`knip.yml:24,192`) — honesto, mas não é gate.                                                                                                                                                                                                                 |
| `qa-console-full.yml:103`  | `npm run qa:console-full`                                        | Mitigado: o step final `Fail if legitimate issues found` (`qa-console-full.yml:158-169`) lê `report.json` e faz `exit 1` se `totals.highSeverity > 0`. **Este é um gate real.** Mas se o sweep falhar antes de gerar `report.json`, o step imprime warning e faz `exit 0` (`:161-164`) — falha aberta. |
| `coverage.yml:28`          | `dawidd6/action-download-artifact` (baseline)                    | Aceitável — sem baseline a primeira execução funciona.                                                                                                                                                                                                                                                 |
| `labeler.yml:11`           | `actions/labeler@v5`                                             | Cosmético.                                                                                                                                                                                                                                                                                             |
| `release.yml:20`           | `softprops/action-gh-release@v1`                                 | O release pode falhar silenciosamente.                                                                                                                                                                                                                                                                 |

**Regra de ouro violada:** um step com `continue-on-error: true` seguido de um step
`if: always()` que imprime `✅ ... completed` produz um check **permanentemente verde**. Esse
padrão exato aparece em 15 workflows.

### 3.3 Comandos apontando para caminhos que não existem

| Evidência                                                                                   | Problema                                                                                                                                    | Mascarado por                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` script `test:unit` = `vitest run --dir src/__tests__/unit`                   | `src/__tests__/unit` **não existe** — os diretórios reais são `src/__tests__/components` e `src/__tests__/lib` (medido: `ls src/__tests__`) | `pr-verify.yml:82` `continue-on-error: true`. O comentário `pr-verify.yml:80-81` **admite o bug por escrito** e escolhe silenciá-lo em vez de corrigir a flag.                                                                                                                                    |
| `package.json` script `report:mobile-nav-diff` → `scripts/build-mobile-nav-diff-report.mjs` | **Arquivo ausente do repositório.** Único caso de 206 referências `scripts/*` no `package.json` cujo alvo não existe.                       | `e2e.yml:38` `npm run report:mobile-nav-diff \|\| true`, com upload `if-no-files-found: ignore` logo abaixo. **Corrigido em 2026-11-28**: o `e2e.yml` foi removido e os steps que chamavam este script saíram junto — o script continua ausente, mas nenhum workflow o invoca mais.               |
| `docker-compose.dev.yml:8,24,36`                                                            | `target: development` nos 3 serviços (`app`, `storybook`, `test`)                                                                           | O `Dockerfile` tem **apenas** dois estágios: `builder` (`Dockerfile:7`) e `production` (`Dockerfile:35`). Não existe estágio `development`. `docker compose -f docker-compose.dev.yml build` falha em todos os três serviços. Nenhum workflow exercita este arquivo, então o erro é invisível. ⬛ |

### 3.4 Documentação que mente sobre o próprio CI

| Afirmação                                                                             | Localização                                        | Realidade medida                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "34 CI/CD pipelines"                                                                  | `.github/README.md:7,15`                           | **45 workflows** em `.github/workflows/` (eram 42; o `e2e.yml` saiu e o `contexto.yml`, `drift` e `e2e-playwright.yml` entraram)                                                                                                   |
| "Paridade com `.husky/pre-commit`, `.husky/pre-push` e `.github/workflows/ci.yml:44`" | `lint.yml:4,45`                                    | `ci.yml:44` é `run: npm run check:migrations`, **não** ESLint. O ESLint em `ci.yml` está **comentado** nas linhas 61-65 (`# - name: ESLint (zero warnings)`). Não existe paridade: o CI principal não roda ESLint de forma alguma. |
| "paridade com ci.yml:44 — continue-on-error"                                          | `.husky/pre-commit:19-22`, `.husky/pre-push:18-21` | Mesmo erro replicado nos dois hooks. Ambos rodam `npm run lint:ci \|\| echo "⚠️ ..."` alegando espelhar um step do `ci.yml` que não existe.                                                                                        |
| Seção "🚀 Deploy" listando `cd.yml`, `deploy.yml`, `preview.yml`, `release.yml`       | `.github/README.md:24-29`                          | Nenhum dos quatro faz deploy (§1).                                                                                                                                                                                                 |
| Seção "🔧 Avançado" listando blue-green, canary, k8s-deploy, rollback                 | `.github/README.md:51-56`                          | Os quatro são `echo` no step summary (§1).                                                                                                                                                                                         |
| "### 4. Kubernetes — `kubectl apply -f k8s/`"                                         | `DEPLOYMENT.md:28-32`                              | Instrução manual; nenhuma automação. Coerente com 🟦.                                                                                                                                                                              |
| "### 1. Vercel (Recomendado)"                                                         | `DEPLOYMENT.md:7-12`                               | Deploy manual via CLI (`vercel`). Explica por que `vercel.json` existe sem workflow.                                                                                                                                               |

### 3.5 Notificação que escuta o nome errado — `observability/`

O bundle de observabilidade define **27 alertas** em `observability/prometheus/*.yml` e dois
arquivos de roteamento. Quatro incompatibilidades de rótulo medidas:

| #   | Roteamento espera                                                                                                     | Regras emitem                                                                                                                                                              | Consequência                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `burn_rate_window="fast"` / `="medium"` / `=~"medium\|slow"` (`observability/alertmanager/visao-routing.yml:124-128`) | `burn_window: fast/medium/slow` (`visao-slo.rules.yml:30,47,63,82,99,114` — 8 ocorrências de `burn_window`, **zero** de `burn_rate_window` em `observability/prometheus/`) | **As duas regras de inibição de burn-rate nunca disparam.** Numa queima rápida de error budget, o `VisaoSloAppFastBurn` (critical), o `MediumBurn` (critical) e o `SlowBurn` (warning) paginam o on-call **simultaneamente** em vez de o rápido suprimir os outros dois. Exatamente o cenário que a inibição existe para evitar. |
| 2   | `team="storage"` → `slack-storage` e `team="backend"` → `slack-backend` (`visao-routing.yml:55-59`)                   | O único `team:` emitido em todo `observability/prometheus/` é `team: sre` (`visao-deploy-freeze.recording.yml:58`)                                                         | Os receivers `slack-storage` (`:104`) e `slack-backend` (`:109`) **nunca recebem nada**. Dois webhooks Slack configurados para o vazio.                                                                                                                                                                                          |
| 3   | `severity="info"` → `ticket-jira` (`visao-routing.yml:68-71`)                                                         | Nenhuma regra emite `severity: info` — só `critical` e `warning`                                                                                                           | Rota morta.                                                                                                                                                                                                                                                                                                                      |
| 4   | `group_by: [alertname, slo, region]` (`visao-routing.yml:27`) e `equal: [alertname, slo, region]` (`:133`)            | Nenhuma regra emite o rótulo `region`                                                                                                                                      | O agrupamento e a inibição por `region` operam sempre sobre `region=""`.                                                                                                                                                                                                                                                         |

Agravante: existem **duas configurações de Alertmanager concorrentes e divergentes** no
repositório — `observability/alertmanager/visao-routing.yml` (receivers `telegram-oncall`,
`pagerduty-oncall`, `slack-warnings`, `slack-storage`, `slack-backend`, `ticket-jira`) e
`observability/prometheus/alertmanager.yml` (receivers `ops-chat`, `pager`). O `README.md` do
bundle (`observability/README.md:5-13`) descreve apenas uma estrutura com
`prometheus/alertmanager.yml` e **não menciona** o diretório `alertmanager/`. Qual está em
produção: **NAO_VERIFICADO**.

Também: `observability/README.md:5-13` documenta a estrutura como contendo 2 arquivos em
`prometheus/` e 2 em `grafana/`. A medição real: **5** arquivos em `prometheus/`, 3 em `grafana/`,
1 em `alertmanager/`, 2 em `blackbox/`.

### 3.6 Gate que falha fechado sem secret — `deploy-freeze-check.yml`

| Evidência                                  | Valor                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `deploy-freeze-check.yml:35`               | `FREEZE_FAIL_MODE: ${{ github.event_name == 'pull_request' && 'open' \|\| 'closed' }}`                  |
| `deploy-freeze-check.yml:33-34`            | `PROMETHEUS_URL: ${{ secrets.PROMETHEUS_URL }}`, `PROMETHEUS_TOKEN: ${{ secrets.PROMETHEUS_TOKEN }}`    |
| `scripts/ci/check-deploy-freeze.mjs:35-38` | `if (!PROM_URL) { log('error','missing_prometheus_url'); process.exit(FAIL_MODE === 'open' ? 0 : 1); }` |
| `deploy-freeze-check.yml:37`               | `run: node scripts/ci/check-deploy-freeze.mjs` — **sem** `continue-on-error`                            |

Comportamento derivado:

- Em **pull request** → `FREEZE_FAIL_MODE=open` → sem `PROMETHEUS_URL` o script sai 0. O gate
  passa sempre, independentemente do estado do SLO. **Em PR, este gate não protege nada** se o
  secret não existir.
- Em **push para `main`** → `FREEZE_FAIL_MODE=closed` → sem `PROMETHEUS_URL` o script sai **1**.
  O workflow reprova em **todo** push para `main`, permanentemente.

Ou seja: dependendo da existência de um único secret, este workflow ou é inútil (PR) ou é uma
falha vermelha permanente (main). Não há caminho em que ele funcione parcialmente.
Se `PROMETHEUS_URL` existe: **NAO_VERIFICADO** — exige acesso a Settings → Secrets → Actions.

Bypass: `deploy-freeze-check.yml:23-30` procura a label `deploy-freeze-override` no PR e seta
`BYPASS_DEPLOY_FREEZE`, que faz o script sair 0 imediatamente (`check-deploy-freeze.mjs:28-33`).
O código chama isso de "auditado", mas a auditoria é um `console.log` JSON no log do runner
(`:29-32`) — não persiste em lugar nenhum.

### 3.7 Secrets referenciados — existência não verificável

11 secrets distintos são referenciados em 6 workflows. **Nenhum pode ser confirmado a partir
do repositório — todos NAO_VERIFICADO.**

| Secret                                                | Workflows                                                                  | Há guarda?                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`                           | `e2e-playwright.yml:29`, `qa-console-full.yml:42`, `pr-test-suite.yml:354` | sim (warning)                                                                          |
| `SUPABASE_DB_URL`                                     | `pr-test-suite.yml:300,320,351,361`                                        | sim — `pr-test-suite.yml:297-307` emite `::warning::` e segue com `available=false`    |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`                | `e2e-playwright.yml:26-27`, `qa-console-full.yml:39-40`                    | sim — `e2e-playwright.yml:76-85` e `qa-console-full.yml:89-98` só emitem `::warning::` |
| `SUPABASE_URL`                                        | `e2e-playwright.yml:28`, `qa-console-full.yml:41`                          | sim                                                                                    |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | `e2e-playwright.yml:31-32`, `pr-test-suite.yml:352-353`                    | não                                                                                    |
| `PROMETHEUS_URL` / `PROMETHEUS_TOKEN`                 | `deploy-freeze-check.yml:33-34`                                            | ver §3.6                                                                               |
| `HEALING_CI_PASSWORD`                                 | `pr-test-suite.yml:355`                                                    | sim — `pr-test-suite.yml:349` `continue-on-error: true`                                |

O padrão dominante é **degradação silenciosa**: o step de guarda emite `::warning::` e os testes
autenticados fazem "skip controlado". Um PR pode passar com **zero** cobertura E2E autenticada
e o check aparece verde. Especificamente:

- `pr-test-suite.yml:409-415` documenta que `db-guardrails` "emite warning (e termina em success)
  quando `SUPABASE_DB_URL` não está configurado". O `suite-gate` (`:412`) então valida
  `DB_RESULT == success` — que é sempre `success`, com ou sem banco. **Os 74 gates `db:check:*`
  (`package.json`, script `db:check:all`) só rodam se o secret existir; caso contrário o gate
  aprova o PR sem ter checado nada.**

Nota: o `suite-gate` é, ainda assim, a peça mais bem-construída do CI — trata `skipped` como
falha explicitamente (`pr-test-suite.yml:401-407`) para impedir que um smoke desligado libere
merge. Essa é a única defesa contra "check verde por omissão" em todo o repositório.

### 3.8 Workflows decorativos gerados por template — 13 idênticos

Treze workflows compartilham o mesmo corpo de 25 linhas, byte a byte, exceto o `name`:

```yaml
- run: npm install --ignore-scripts || npm install --force || true
  continue-on-error: true
- run: npm run build || true
  continue-on-error: true
- if: always()
  run: echo '## ✅ <Nome> completed' >> $GITHUB_STEP_SUMMARY
```

`accessibility.yml`, `bundle-size.yml`, `cd.yml`, `chromatic.yml`, `dependency-audit.yml`,
`e2e-coverage.yml`, `feature-flags.yml`, `lighthouse.yml`, `performance.yml`,
`security-scan.yml`, `semantic-release.yml`, `size.yml`, `visual-regression.yml`.

Cada um tem **três camadas** de anulação: `|| true` no shell, `continue-on-error: true` no step,
e `if: always()` no `echo` final. Não existe input pelo qual qualquer um deles possa reprovar.

O que cada um **alega** fazer vs. o que faz:

| Workflow                                     | Alega                      | Faz                                                                                                                                                                         |
| -------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chromatic.yml`                              | Visual testing (Chromatic) | build; nenhuma referência a Chromatic, `CHROMATIC_PROJECT_TOKEN` ou `chromaui/action`                                                                                       |
| `visual-regression.yml`                      | Regressão visual           | build; nenhum screenshot, nenhuma comparação                                                                                                                                |
| `lighthouse.yml`                             | Lighthouse CI              | build; **`lighthouse-budgets.json` existe na raiz e nunca é lido por nada**                                                                                                 |
| `bundle-size.yml` / `size.yml`               | Tamanho do bundle          | build; o gate real de bundle está em `ci.yml:78` (`npm run check:bundle-size`)                                                                                              |
| `security-scan.yml` / `dependency-audit.yml` | Vulnerability scanning     | `npm audit --audit-level=none \|\| true` (`security-scan.yml:29`, `dependency-audit.yml:27`) — `--audit-level=none` **desliga o critério de falha** e ainda tem `\|\| true` |
| `semantic-release.yml`                       | Semantic Release           | build; nunca invoca `semantic-release` (o script `release` existe em `package.json` e nunca é chamado)                                                                      |
| `accessibility.yml`                          | Testes de acessibilidade   | build; o teste a11y real está em `a11y-axe.yml`, e lá é `continue-on-error`                                                                                                 |
| `e2e-coverage.yml`                           | Cobertura de E2E           | build; nenhum Playwright                                                                                                                                                    |
| `feature-flags.yml`                          | Feature flags              | build; nada relacionado                                                                                                                                                     |
| `performance.yml`                            | Testes de performance      | build                                                                                                                                                                       |
| `cd.yml`                                     | Continuous Deployment      | build (§1)                                                                                                                                                                  |

Comparação direta: `security.yml:30` roda `npm audit --audit-level=high` **sem** `continue-on-error`
— é o único audit que pode reprovar. Os outros três (`security-scan.yml`, `dependency-audit.yml`,
e `test.yml:59` com `npm audit --audit-level=critical || true`) são cosméticos. Quatro workflows
de auditoria de dependências, **um** funciona.

### 3.9 `docker-security.yml` — filtro de caminho válido, gate inexistente

| Evidência                           | Valor                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `docker-security.yml:5-9`           | `paths: ['Dockerfile', 'docker-compose*.yml']` em `push:[main]` e `pull_request:[main]`                        |
| Arquivos correspondentes existentes | `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.prod.yml` — o filtro **dispara** |
| `docker-security.yml:24-32`         | Todo o trabalho é: `grep -q "USER" Dockerfile && echo "✅ Non-root" \|\| echo "⚠️ Consider adding"`            |

O filtro de caminho está correto (não é um gate morto por path). Mas o "check de segurança" é um
`grep` cujos dois ramos escrevem no step summary e **nenhum** retorna código de erro. Sem Trivy,
Hadolint, Snyk ou Docker Scout.

Medição do que ele deveria ter pego: **o `Dockerfile` não tem instrução `USER`** (`grep -n '^USER'
Dockerfile` → vazio). O estágio final é `nginx:alpine` rodando como root. O `agent/Dockerfile`
também não tem `USER` (`FROM node:20-alpine`, sem `USER`). Ironicamente,
`k8s/deployment.yaml:21-27` impõe `runAsNonRoot: true` / `runAsUser: 101` — o manifest que nunca
é aplicado é o único lugar onde a política existe. Classe: ⬛.

### 3.10 `auto-merge.yml` — nome perigoso, corpo vazio, trigger arriscado

> ✅ **CONFIRMADO EMPIRICAMENTE** — no PR #88, em rascunho, o job `auto-merge` foi enfileirado.
> Análise completa do risco composto em **§0.5**.

```yaml
name: Auto Merge
on:
  pull_request_target: # auto-merge.yml:3 — sem filtro de types
jobs:
  auto-merge:
    permissions:
      contents: write # auto-merge.yml:8
      pull-requests: write # auto-merge.yml:9
    steps:
      - uses: actions/checkout@v4 # auto-merge.yml:11
      - run: echo "✅ Auto merge check completed" # auto-merge.yml:12-14
```

Não faz merge de nada. Mas dispara em `pull_request_target` (contexto privilegiado, com secrets
e token de escrita) **e faz `actions/checkout@v4` sem `ref:` explícito**. Nesta configuração o
checkout traz a base, não o head do PR, o que evita o padrão clássico de exploração — mas o
workflow concede `contents: write` a um job que só imprime texto. `dependabot.yml:13-15` marca
todos os PRs do Dependabot com a label `automerge`, sugerindo que este workflow _deveria_ estar
consumindo essa label. Não consome. Classe: ⬛ (e risco de superfície).

Mesmo padrão em `labeler.yml:2` (`on: [pull_request_target]`) — este ao menos executa
`actions/labeler@v5` de verdade, ainda que com `continue-on-error: true`.

### 3.11 `terraform.yml` — infraestrutura como código sem código

```yaml
name: Terraform            # terraform.yml:1
on: workflow_dispatch      # terraform.yml:2-3
- run: echo "✅ Infrastructure as Code ready"   # terraform.yml:9-11
```

11 linhas. `find . -name '*.tf'` → **nenhum arquivo Terraform no repositório**. ⬛.

---

## 4. Tabela mestre — 45 workflows

> ⚠️ A coluna **Classe** abaixo responde _"este workflow protegeria algo se as dependências
> instalassem?"_. Hoje, por §0.1, a resposta prática para todos os 40 que instalam dependências
> é **não** — eles morrem no `npm ci`/`bun install`. Leia a tabela como o **teto** do que o CI
> poderia oferecer depois de corrigido `package.json:352`.

|     # | Workflow                                                                                                                                                                                              | `on:`                                          | Gate real?                                                                                               | Classe |
| ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
|     1 | `pr-test-suite.yml`                                                                                                                                                                                   | PR, dispatch                                   | 5 jobs + `suite-gate` agregador que trata `skipped` como falha (`:401-407`)                              | ✅     |
|     2 | `e2e-playwright.yml`                                                                                                                                                                                  | PR, dispatch                                   | Playwright chromium 2 shards, sem `continue-on-error` (`:87-89`)                                         | ✅     |
|     3 | `qa-console-full.yml`                                                                                                                                                                                 | PR (paths), cron `0 4 * * *`, dispatch         | `exit 1` se `highSeverity > 0` (`:158-169`)                                                              | ✅     |
|     4 | `security.yml`                                                                                                                                                                                        | push main, cron `0 0 * * 0`, dispatch          | `npm audit --audit-level=high` sem escape (`:30`)                                                        | ✅     |
|     5 | `stale.yml`                                                                                                                                                                                           | cron `0 0 * * *`, dispatch                     | `actions/stale@v9` com política completa (`:17-29`)                                                      | ✅     |
|     6 | `lint-autofix.yml`                                                                                                                                                                                    | PR, dispatch                                   | Commita `eslint --fix` de volta no branch do PR (`:102-115`)                                             | ✅     |
|     7 | `ci.yml`                                                                                                                                                                                              | push main/develop, PR main, dispatch           | 13 gates reais, **mas colide com `test.yml`** (§3.1); ESLint comentado (`:61-65`)                        | 🟨     |
|     8 | `test.yml`                                                                                                                                                                                            | idênticos a `ci.yml`                           | `tsc --noEmit` + vitest reais; lint e audit escapados; **colisão** (§3.1)                                | 🟨     |
|     9 | `pr-verify.yml`                                                                                                                                                                                       | PR main, dispatch                              | `type-check:strict`, `verify:stack`, `build` bloqueiam; lint e `test:unit` escapados (`:76,82`)          | 🟨     |
|    10 | `deploy-freeze-check.yml`                                                                                                                                                                             | PR main, push main, dispatch                   | Inútil em PR ou vermelho permanente em main (§3.6)                                                       | 🟨     |
|    11 | `coverage.yml`                                                                                                                                                                                        | push main, **todo PR**, dispatch               | `COVERAGE_FAIL_ON_DROP` default `'0'` (`:49`) → nunca reprova por queda                                  | 🟨     |
|    12 | `e2e-playwright.yml`                                                                                                                                                                                  | push main, PR main, dispatch                   | **Sucessor único do `e2e.yml`** desde 2026-11-28: 2 shards, `environment: e2e`, roda `push` em main e PR | ✅     |
|    13 | `deploy.yml`                                                                                                                                                                                          | push main, dispatch                            | `type-check:strict` + `build` bloqueiam; **não faz deploy** (§1)                                         | 🟨     |
|    14 | `a11y-axe.yml`                                                                                                                                                                                        | push main, PR main, dispatch                   | `simulate-wave-61-a11y-ci.mjs` bloqueia (`:26`); axe escapado (`:29`)                                    | 🟨     |
|    15 | `knip.yml`                                                                                                                                                                                            | PR main, push main, cron `0 6 * * 1`, dispatch | Warning-only declarado (`:24,192`) — honesto                                                             | 🟨     |
|    16 | `codeql.yml`                                                                                                                                                                                          | push main, cron `0 0 * * 0`, dispatch          | 3 de 3 steps escapados (`:27,31,35`)                                                                     | 🟨     |
|    17 | `labeler.yml`                                                                                                                                                                                         | `pull_request_target`                          | `actions/labeler@v5` escapado (`:11`)                                                                    | 🟨     |
|    18 | `release.yml`                                                                                                                                                                                         | `push: tags:['v*']`                            | `softprops/action-gh-release` escapado (`:20`)                                                           | 🟨     |
|    19 | `lint.yml`                                                                                                                                                                                            | push main/develop, PR main/develop, dispatch   | Único step escapado (`:35`) → sempre verde                                                               | ⬛     |
|    20 | `dependency-review.yml`                                                                                                                                                                               | `[pull_request]`                               | Único step escapado (`:12`)                                                                              | ⬛     |
|    21 | `docker-security.yml`                                                                                                                                                                                 | push/PR main com `paths`                       | `grep` sem exit code (§3.9)                                                                              | ⬛     |
|    22 | `auto-merge.yml`                                                                                                                                                                                      | `pull_request_target`                          | `echo` com `contents: write` (§3.10)                                                                     | ⬛     |
|    23 | `terraform.yml`                                                                                                                                                                                       | dispatch                                       | `echo`; zero arquivos `.tf` (§3.11)                                                                      | ⬛     |
|    24 | `rollback.yml`                                                                                                                                                                                        | dispatch                                       | checkout + `echo`                                                                                        | ⬛     |
|    25 | `blue-green.yml`                                                                                                                                                                                      | dispatch                                       | build + `echo`                                                                                           | ⬛     |
|    26 | `canary-deploy.yml`                                                                                                                                                                                   | dispatch                                       | build + `echo`                                                                                           | ⬛     |
|    27 | `k8s-deploy.yml`                                                                                                                                                                                      | dispatch                                       | build + `echo`; `k8s/` nunca aplicado                                                                    | ⬛     |
|    28 | `preview.yml`                                                                                                                                                                                         | `[pull_request]`                               | build + `echo`; sem URL de preview                                                                       | ⬛     |
|    29 | `stress-test.yml`                                                                                                                                                                                     | dispatch, cron `0 3 * * 0`                     | build + `echo "ready for stress testing"` (`:31-37`); nenhum stress                                      | ⬛     |
| 30–42 | `accessibility`, `bundle-size`, `cd`, `chromatic`, `dependency-audit`, `e2e-coverage`, `feature-flags`, `lighthouse`, `performance`, `security-scan`, `semantic-release`, `size`, `visual-regression` | push main + dispatch                           | Template idêntico de 25 linhas com tripla anulação (§3.8)                                                | ⬛ ×13 |

**Filtro de caminho:** apenas **3 de 45** workflows declaram `paths:` (`docker-security.yml:6,9`
e `qa-console-full.yml:12-17`); **nenhum** declara `paths-ignore:`. Os outros **40 (95%)**
disparam em qualquer diff, inclusive alterações só de documentação — confirmado em §0.2 com
22 check runs para um PR de 2 arquivos `.md`.

**Cobertura efetiva de PR:** dos 45 workflows, **13** disparam em `pull_request`/`pull_request_target`
(`a11y-axe`, `auto-merge`, `ci`, `coverage`, `dependency-review`, `deploy-freeze-check`,
`docker-security`, `e2e-playwright`, `knip`, `labeler`, `lint`, `lint-autofix`, `pr-test-suite`,
`pr-verify`, `preview`, `qa-console-full`, `test`). Os 25 restantes disparam só em `push:[main]`
(pós-merge) ou só em `workflow_dispatch` — não protegem PR nenhum.

---

## 5. `scripts/` — 333 arquivos, 60.281 linhas, 32% alcançável

### 5.1 Composição

| Prefixo        |     Qtd | Observação                                    |
| -------------- | ------: | --------------------------------------------- |
| `simulate-*`   | **204** | 61% de todo o diretório                       |
| `check-*`      |      86 | núcleo dos gates de `ci.yml` e `db:check:all` |
| `generate-*`   |       5 |                                               |
| `build-*`      |       5 |                                               |
| `seed*`        |       4 |                                               |
| `wave-59-*.py` |       3 | scripts Python de reparo pontual (§5.3)       |
| `install-*`    |       2 |                                               |
| `audit-*`      |       2 |                                               |
| outros         |      22 | inclui `scripts/ci/` (2) e `scripts/sql/` (1) |

### 5.2 Quem executa o quê

Método: fecho transitivo a partir dos comandos `npm|bun|pnpm run <X>` encontrados nos 42
workflows + `.husky/pre-commit` + `.husky/pre-push`, expandindo pelos corpos dos scripts de
`package.json` e incluindo os lifecycle hooks `pre*`/`post*` do npm.

| Métrica                                                                            |                Valor |
| ---------------------------------------------------------------------------------- | -------------------: |
| Scripts npm definidos em `package.json`                                            |              **309** |
| Invocados **diretamente** por workflow ou hook                                     |               **33** |
| Alcançáveis no fecho transitivo (inclui `prebuild` → `build`)                      | **117** de 309 (38%) |
| Arquivos de `scripts/` alcançados por esse fecho                                   | **107** de 333 (32%) |
| Arquivos de `scripts/` referenciados em `package.json` mas **fora** do fecho do CI |     **104** (31%) 🟦 |
| Arquivos de `scripts/` **órfãos absolutos**                                        |     **122** (37%) ⬛ |

Os 33 comandos npm que o CI realmente invoca:

```
audit:deadcode:check   check:bundle-size    check:csp             check:migrations
check:mobile-nav       check:page-content   check:skeletons       coverage
coverage:check         db:check:all         db:exercise:healing-loop
format:check           lint                 lint:ci               qa:console-full
report:mobile-nav-diff seed:healing-ci-user:ci                    sim:wave147
sim:wave148            sim:wave149          simulate:network-chaos
test                   test:mobile-nav-class                      test:mobile-nav-overlap
test:mobile-nav-runtime test:mobile-nav-visual  test:smoke        test:unit
type-check:strict      verify:stack         build   dev   audit:report
```

Os 9 scripts invocados **diretamente** por workflow (fora de `package.json`):

| Script                                    | Workflow                                      |
| ----------------------------------------- | --------------------------------------------- |
| `scripts/ci/check-deploy-freeze.mjs`      | `deploy-freeze-check.yml:37`                  |
| `scripts/ci/build-playwright-summary.mjs` | `e2e-playwright.yml:161`                      |
| `scripts/simulate-wave-61-a11y-ci.mjs`    | `a11y-axe.yml:26`                             |
| `scripts/audit-deadcode.mjs`              | `knip.yml:47,104`                             |
| `scripts/check-deadcode-baseline.mjs`     | `knip.yml:72,78`                              |
| `scripts/vitest-flaky-retry.mjs`          | `pr-test-suite.yml:120`                       |
| `scripts/build-coverage-comment.mjs`      | `pr-test-suite.yml:151`                       |
| `scripts/build-qa-console-report.mjs`     | `qa-console-full.yml` (via `qa:console-full`) |
| `scripts/generate-version-json.mjs`       | `deploy.yml:29` + `package.json` (`build`)    |

### 5.3 Os 204 `simulate-*` — 5 chegam ao CI

| Métrica                                                                             |        Valor |
| ----------------------------------------------------------------------------------- | -----------: |
| `scripts/simulate-*` no disco                                                       |      **204** |
| Referenciados em `package.json`                                                     |           98 |
| **Órfãos absolutos** (nem `package.json`, nem workflow, nem hook, nem outro script) |   **106** ⬛ |
| **Alcançados pelo CI**                                                              | **5** (2,5%) |

Os 5 que rodam em CI:

| Script                               | Via                              | Onde                    |
| ------------------------------------ | -------------------------------- | ----------------------- |
| `simulate-wave144-network-chaos.mjs` | `npm run simulate:network-chaos` | `pr-test-suite.yml:71`  |
| `simulate-wave147-blame-routing.mjs` | `npm run sim:wave147`            | `pr-test-suite.yml:329` |
| `simulate-wave148-owner-filter.mjs`  | `npm run sim:wave148`            | `pr-test-suite.yml:334` |
| `simulate-wave149-owner-aging.mjs`   | `npm run sim:wave149`            | `pr-test-suite.yml:337` |
| `simulate-wave-61-a11y-ci.mjs`       | direto                           | `a11y-axe.yml:26`       |

Os 199 restantes — incluindo `simulate-wave8` a `simulate-wave246`, as séries
`simulate-wave-storage-04` a `-28` (25 arquivos), `simulate-wave-shinobi-1` a `-9` (9 arquivos),
`simulate-wave-fortress-1/2/5` — são executáveis manuais. As séries `-storage-`, `-shinobi-` e
`-fortress-` são **integralmente órfãs**: nenhum dos 37 arquivos aparece em `package.json`,
workflow, hook ou outro script.

Três scripts Python de reparo pontual (`wave-59-aria-label-injector.py`,
`wave-59-repair-arrows.py`, `wave-59-repair.py`) são órfãos e não têm runtime Python declarado
em lugar nenhum do repositório.

### 5.4 Amostra dos 122 órfãos absolutos ⬛

Além dos 106 `simulate-*` e 3 `.py`, os 13 restantes são shell scripts de operação que ninguém
chama — vários com nomes que sugerem que _deveriam_ ser o pipeline:

| Script                                                                                   | Nome sugere        | Quem chama                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `scripts/deploy.sh`                                                                      | deploy             | **ninguém**                                                                    |
| `scripts/db-migrate.sh`                                                                  | migração de banco  | **ninguém** (relevante: 361 migrations vs 3 registradas — `_FATOS_RUNTIME.md`) |
| `scripts/health-check.sh`                                                                | health check       | **ninguém**                                                                    |
| `scripts/setup.sh`                                                                       | setup do projeto   | **ninguém**                                                                    |
| `scripts/seed.sh`, `scripts/seed-rules.mjs`                                              | seed               | **ninguém**                                                                    |
| `scripts/clean.sh`                                                                       | limpeza            | **ninguém** (`Makefile:19-20` tem seu próprio `clean`)                         |
| `scripts/pre-commit.sh`                                                                  | hook de pre-commit | **ninguém** — `.husky/pre-commit` não o invoca                                 |
| `scripts/analyze-bundle.sh`                                                              | análise de bundle  | **ninguém**                                                                    |
| `scripts/generate-types.sh`, `scripts/generate-api-sdk.mjs`, `scripts/generate-icons.js` | codegen            | **ninguém**                                                                    |
| `scripts/install-deps.sh`, `scripts/install-all-deps.sh`                                 | instalação         | **ninguém**                                                                    |

### 5.5 `db:check:*` — 74 gates que dependem de um secret

`package.json`, script `db:check:all`, encadeia **74** invocações `npm run db:check:*` com `&&`.
É o maior gate único do repositório. É invocado uma vez, em `pr-test-suite.yml:322`, sob
`if: steps.creds.outputs.available == 'true'` (`:318`) — ou seja, **só roda se
`secrets.SUPABASE_DB_URL` existir**. Se não existir, `pr-test-suite.yml:297-307` emite
`::warning::` e o job termina `success`, e o `suite-gate` (`:412`) aprova.

**RESOLVIDO em 2026-11-28: o secret NÃO existe.** `gh secret list` no repositório devolve 10
secrets — `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `MIGRATE_HELPER_ACCESS_KEY`, `RESEND_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VERCEL_TOKEN`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` — e **nenhum `SUPABASE_DB_URL`**. Prova
independente: o log do job `Guardrails de banco` do run `46166614785` traz
`##[warning]SUPABASE_DB_URL ausente — guardrails de banco não executados.` e o job termina
`success`.

Consequência concreta: **os 74 gates de banco nunca executaram em nenhum PR desde que existem.**
O job verde que os representa é falso-verde — não mede nada. O `test:drift` roda, mas alimentado
com dados de fixture, não com o banco real.

**Mitigado em 2026-11-28 (PR #246, verificado em CI real).** O job não pode executar os gates sem
o secret, mas deixou de esconder isso. Log do job `141066159909` (run `46172808232`, já com o
código novo):

```
##[warning]SUPABASE_DB_URL ausente — guardrails de banco NÃO executaram; este check não mede nada.
```

e o `$GITHUB_STEP_SUMMARY` recebe o bloco `### Guardrails de banco NÃO executaram` com o caminho
para ativar. O verde continua verde (reprovar todo PR não restauraria o gate), mas deixa de ser
silencioso.

Isto não é corrigível por código: exige o dono cadastrar a string de conexão do Postgres. O
`migrate-helper` **não** é atalho para isso — ele devolve `service_role` e `db_url` numa resposta
HTTP com `Access-Control-Allow-Origin: *`, protegida por uma chave estática do GitHub. Não é um
cofre.

Como o encadeamento é `&&` sequencial, o primeiro `db:check:*` que falhar aborta os 73 seguintes
— não há relatório agregado de quais gates de banco passaram.

---

## 6. Docker, nginx e k8s

| Peça                             | Achado                                                                                                                                                                                                                                                                                                                                                                                  | Classe |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `Dockerfile`                     | 2 estágios (`builder` node:22-alpine, `production` nginx:alpine). Multi-stage correto, `HEALTHCHECK` presente (`:50-51`). **Sem `USER`** — nginx roda como root.                                                                                                                                                                                                                        | 🟨     |
| `Dockerfile:16`                  | `RUN npm ci --ignore-scripts --only=production=false` — a flag `--only=production=false` é malformada (`--only` aceita `prod`/`dev`, não um booleano). Provavelmente ignorada pelo npm moderno; efeito real **NAO_VERIFICADO** (não é possível executar).                                                                                                                               | 🟨     |
| `Dockerfile:12`                  | `COPY bun.lockb* ./` — o repositório tem `bun.lock` (656 KB), não `bun.lockb`. O glob não casa e é silenciosamente vazio. O build usa `npm ci` sobre `package-lock.json`, enquanto `pr-verify.yml:60` e `e2e-playwright.yml:54` usam `bun install --frozen-lockfile` sobre `bun.lock`. **Dois gerenciadores, dois lockfiles, resultados potencialmente divergentes entre CI e imagem.** | 🟨     |
| `Dockerfile:38`                  | `COPY docker/nginx.conf ...` — a imagem usa `docker/nginx.conf` (52 linhas).                                                                                                                                                                                                                                                                                                            | ✅     |
| `nginx.conf` (raiz, 104 linhas)  | Versão mais completa: CSP explícita (`:32`), HSTS (`:29`), `Permissions-Policy` (`:28`), proxy `/api` e `/ws` para `http://backend:3000`. **Nunca é copiada para imagem nenhuma** — nenhum `Dockerfile` nem `docker-compose` a referencia. É o arquivo com toda a política de segurança HTTP e está fora do caminho de execução.                                                        | ⬛     |
| `docker/nginx.conf` (a que roda) | **Sem CSP, sem HSTS, sem `Permissions-Policy`.** Só `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy` (`:15-18`). Tem `/health` (`:48-52`), que satisfaz os probes de `k8s/deployment.yaml:52,60` e o healthcheck de `docker-compose.yml:31`.                                                                                                          | 🟨     |
| `docker-compose.yml`             | Stack completa: `app` + `mediamtx` (bluenviron) + `redis`, rede `172.28.0.0/16`, healthchecks. Bem-formado. Nenhum workflow o exercita. `version: '3.8'` é obsoleto no Compose v2.                                                                                                                                                                                                      | 🟦     |
| `docker-compose.dev.yml`         | `target: development` × 3, estágio inexistente → **build falha** (§3.3).                                                                                                                                                                                                                                                                                                                | ⬛     |
| `docker-compose.prod.yml`        | 9 linhas, `build: .` + porta 80. Ignora `mediamtx` e `redis` que `docker-compose.yml` declara essenciais. Nenhum consumidor.                                                                                                                                                                                                                                                            | 🟦     |
| `docker/` (demais)               | `mediamtx.yml`, `mediamtx-pilot.yml`, `mediamtx-recording.yml`, `docker-compose.mediamtx.yml`, `docker-compose.mediamtx.swarm.yml`, `pilot-synthetic-camera.sh`, `upload-segment.sh`, `README.mediamtx.md`. Nenhum é referenciado por workflow.                                                                                                                                         | 🟦     |
| `agent/Dockerfile`               | `FROM node:20-alpine`, sem `USER`. Nenhum workflow constrói a imagem do agente.                                                                                                                                                                                                                                                                                                         | 🟦     |
| `k8s/*` (6 manifests)            | Qualidade alta (§2). Nunca aplicado. `k8s/secrets.yaml:13-29` é template com placeholders `'your-*'` — correto não conter segredos, mas declara `VITE_FIREBASE_*`, `VITE_MAPBOX_TOKEN`, `VITE_SENTRY_DSN` que não aparecem em `.env.production`.                                                                                                                                        | 🟦     |

---

## 7. Ferramentas de monorepo declaradas e não usadas

| Arquivo                                   | Declara                                                                                          | Realidade                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `turbo.json`                              | pipeline com 8 tasks; usa a chave **`pipeline`** (`:5`), renomeada para `tasks` no Turborepo 2.x | Nenhum workflow, `package.json` ou `Makefile` invoca `turbo`. `pnpm-workspace.yaml` existe, mas o CI usa npm e bun. ⬛                                                                                                                                           |
| `nx.json`                                 | `npmScope: visao`, cache de `build/lint/test/e2e`, generators `@nx/react`                        | Nenhuma invocação de `nx` em lugar nenhum. `nx.json:26` referencia `.eslintrc.json` — o repositório usa `eslint.config.js` (flat config) + `.eslintrc.cjs`. ⬛                                                                                                   |
| `Makefile`                                | 6 alvos (`dev`, `build`, `test`, `lint`, `install`, `clean`) que só encapsulam `npm run`         | Nenhum workflow invoca `make`. 🟦                                                                                                                                                                                                                                |
| `lighthouse-budgets.json`                 | Orçamentos LCP 2500ms, TTI 3500ms, CLS 0.1, script 350 KB                                        | Nenhum consumidor: `lighthouse.yml` só faz build (§3.8); nenhum `lighthouserc`, nenhum `@lhci/cli`. ⬛                                                                                                                                                           |
| `quality-gates.config.json`               | Perfis `dev` e `ci` (`lint.maxWarnings`, `typecheck.config`, `vitest.minPassRate`)               | Referenciado por `scripts/quality-gates.mjs` (alcançável), mas o perfil `ci` declara `lint.maxWarnings: 0` — contradiz `lint.yml:35` e `pr-verify.yml:76`, onde o lint é `continue-on-error`. Configuração viva descrevendo uma política que o CI não aplica. 🟨 |
| `knip.json`                               | Config real do Knip, consumida por `scripts/audit-deadcode.mjs` via `knip.yml` e `ci.yml:50`     | Único config de tooling da raiz que é efetivamente usado. ✅                                                                                                                                                                                                     |
| `renovate.json` + `.github/renovate.json` | **Dois** configs de Renovate                                                                     | Coexistem com `.github/dependabot.yml`. Três configuradores de atualização de dependência. Qual está ativo: **NAO_VERIFICADO**. 🟦                                                                                                                               |

---

## 8. Lacunas desta auditoria

Itens que **não podem ser resolvidos** a partir do repositório e que ficam explicitamente
marcados como **NAO_VERIFICADO**. Nenhuma verificação foi simulada.

### Resolvido pela evidência do PR #88 (não é mais lacuna)

- ✅ **Resultado real dos checks.** Observado no PR #88: 22 check runs, 12 falhas por
  `EBADPLATFORM` no `npm ci` (§0.1), 3 `cancelled` em 1s (§0.3), jobs de matriz `skipped`
  em rascunho (§0.4).
- ✅ **A colisão de concorrência de §3.1 de fato cancela runs.** Confirmado — `test.yml`
  inteiro foi cancelado (§0.3).
- ✅ **`auto-merge` dispara em PR rascunho.** Confirmado (§0.5).

### Lacunas remanescentes

1. **⚠️ A lacuna mais importante: quais workflows estão _required_ na proteção de branch.**
   Elevada de "decisiva" a **crítica** por §0.1: como o CI não consegue ficar verde, o estado
   da branch protection determina se `main` está travada (merges só por bypass admin) ou se os
   checks são puramente cosméticos. Agravado pela colisão de nome "CI" (§3.1) — não é possível
   saber se a regra aponta para `ci.yml` ou `test.yml` — e pelo fato de `cancelled` não contar
   como falha em várias configurações. Para fechar:
   `gh api repos/adm01-debug/vis-o-v2/branches/main/protection`.

2. **Se `bun.lock` carrega a mesma entrada obrigatória de `@swc/core-win32-x64-msvc`.**
   `pr-verify.yml` e `e2e-playwright.yml` usam `bun install --frozen-lockfile` e mesmo assim
   falharam no PR #88, o que sugere que sim — mas o arquivo tem 656 KB em formato
   binário-textual e não foi lido. Determina se a correção em `package.json:352` basta ou se
   os dois lockfiles precisam ser regenerados.

3. **Há quanto tempo o CI está quebrado.** `package.json:352` e as 6 entradas do
   `package-lock.json` já estão em `main` (medido via `git show main:`), mas o commit que
   introduziu a linha não foi rastreado. Para fechar:
   `git log -S '@swc/core-win32-x64-msvc' --oneline -- package.json`. Define se os merges
   recentes em `main` (`5378651`, `e9bc5c4`) passaram sem verificação alguma.

4. **Existência dos 11 secrets** (`SUPABASE_DB_URL`, `PROMETHEUS_URL`, `E2E_TEST_*`, etc.).
   Determina se 74 gates `db:check:*` rodam, se a cobertura E2E autenticada existe, e se
   `deploy-freeze-check.yml` é inútil ou permanentemente vermelho (§3.6, §3.7, §5.5).
   Só verificável em Settings → Secrets and variables → Actions.

5. **Existência das _variables_** `COVERAGE_DROP_THRESHOLD`, `COVERAGE_FAIL_ON_DROP`,
   `COVERAGE_TOLERANCE_PP`. Os defaults no YAML (`'2'`, `'0'`, `'0.5'`) tornam o gate de
   cobertura não-bloqueante; se as variables existirem com outros valores, o comportamento muda.

6. **Qual é o pipeline de deploy real.** Está provado que **não é** nenhum dos 45 workflows (§1).
   A hipótese Lovable é circunstancial (`.lovable/`, `lovable-tagger`, `ai.gateway.lovable.dev`
   no CSP). Não confirmada.

7. **Qual configuração de Alertmanager está em produção** — `observability/alertmanager/visao-routing.yml`
   ou `observability/prometheus/alertmanager.yml` (§3.5). Se for a primeira, as 4
   incompatibilidades de rótulo estão ativas; se for a segunda, os receivers Slack/PagerDuty/Jira
   nem existem.

8. **Se o bundle de `observability/` está provisionado em algum Prometheus.** Nenhum workflow o
   sincroniza. Pode ser documentação de uma stack que existe fora do repositório, ou uma stack
   que nunca foi levantada.

9. **Comportamento em runtime de `Dockerfile:16`** (flag `--only=production=false` malformada) e
   se a imagem constrói. `node_modules` ausente e nenhum daemon Docker — **proibido afirmar que
   compila** (`_FATOS_RUNTIME.md:93-95`).

10. **Se os 122 scripts órfãos são realmente inertes.** A varredura cobriu `package.json`, os 42
    workflows, `.husky/*`, `Makefile`, configs de lint-staged, `Dockerfile`, `docker-compose.yml`
    e referências cruzadas entre scripts. **Não** cobriu: invocação manual documentada em
    `docs/`, invocação por `pg_cron` (69 jobs ativos em produção, `_FATOS_RUNTIME.md:22-26`),
    ou invocação por Edge Functions.

11. **"Gate obrigatório com filtro de caminho que nunca dispara" — hipótese descartada, com
    ressalva.** Apenas 3 de 45 workflows usam `paths:` (`docker-security.yml:6,9`,
    `qa-console-full.yml:12-17`); os caminhos dos dois foram conferidos contra o disco e
    **todos existem**. Nenhum gate morto por filtro de caminho. A patologia real é a
    **oposta** — ausência de filtro em 95% dos workflows (§0.2) — somada a `continue-on-error`
    e `|| true` (§3.2, §3.8). Ressalva: `qa-console-full.yml` roda em cron diário
    (`:19`, `0 4 * * *`), então seu `paths:` restringe apenas o disparo por PR; não foi
    verificado se o cron tem executado.

12. **Contagem de `scripts/`.** O escopo citava 319 arquivos; a medição real deu **333**. A
    diferença de 14 não foi investigada (possível recontagem em data diferente, ou exclusão de
    `.md`/`.json`/`.sql`). Todos os percentuais deste documento usam o denominador medido de 333.
