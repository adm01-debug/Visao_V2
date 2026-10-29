# 07 — TESTES

> Auditoria da dimensão TESTES. Data: 2026-08-16.
> Base factual: `docs/estado/_FATOS_RUNTIME.md`.
> **Nenhum teste foi executado.** `node_modules` não está instalado. Toda avaliação abaixo é
> análise estática do código-fonte dos testes e dos arquivos de configuração/pipeline.

---

## VEREDITO

**Os testes protegem 13,5% do sistema — 160 de 1.185 módulos de produção em `src/`.**

Esse é o número estrutural: quantos arquivos `.ts/.tsx` de produção são alcançados por _algum_
`import` vindo de _algum_ arquivo de teste. Não é cobertura de linha; é a fronteira máxima
teórica do que os testes conseguem tocar.

O próprio repositório mede a cobertura real e a registra em `coverage-baseline.json:5-10`:

| métrica    | baseline travada | data                                    |
| ---------- | ---------------: | --------------------------------------- |
| statements |       **7,92 %** | `coverage-baseline.json:3` — 2026-07-26 |
| branches   |           6,36 % | idem                                    |
| functions  |           5,15 % | idem                                    |
| lines      |           8,71 % | idem                                    |

Ou seja: **92 % das instruções de `src/` nunca são executadas por teste algum**, e esse patamar
está _congelado por contrato_ — o gate de CI só reprova quedas maiores que 0,5 pp
(`coverage-baseline.json:4`), nunca exige subir.

### Distribuição do dano — módulos de produção alcançados por import de teste

| área                                           | módulos de produção | alcançados por teste |          % |
| ---------------------------------------------- | ------------------: | -------------------: | ---------: |
| `src/lib`                                      |                 181 |                  123 | **68,0 %** |
| `src/providers`                                |                   7 |                    1 |     14,3 % |
| `src/middleware`                               |                   6 |                    1 |     16,7 % |
| `src/layouts`                                  |                   6 |                    1 |     16,7 % |
| `src/stores`                                   |                  18 |                    1 |      5,6 % |
| `src/components`                               |                 615 |                   31 |  **5,0 %** |
| `src/hooks`                                    |                 180 |                    2 |  **1,1 %** |
| `src/pages`                                    |                  89 |                    0 |  **0,0 %** |
| `src/contexts`                                 |                  15 |                    0 |      0,0 % |
| `src/integrations`                             |                   5 |                    0 |      0,0 % |
| `src/config`                                   |                  12 |                    0 |      0,0 % |
| `src/constants`                                |                  22 |                    0 |      0,0 % |
| `src/data`                                     |                   4 |                    0 |      0,0 % |
| demais (`types`, `i18n`, `sdk`, `utils`, raiz) |                  25 |                    0 |      0,0 % |
| **TOTAL**                                      |           **1.185** |              **160** | **13,5 %** |

A suíte é uma **ilha em `src/lib`**. Nenhuma das 89 páginas tem teste. 178 dos 180 hooks
não têm teste — inclusive `src/hooks/useCameras.ts`, o hook da entidade com dados reais
em produção (35 câmeras, `_FATOS_RUNTIME.md:41`), que aparece nos testes **apenas como mock**
(`src/components/__tests__/AutomationRulesManager.test.tsx:26-28`).

### Inventário bruto

| suíte                                    |   arquivos | runner declarado                       | executado em CI?                                           | classificação |
| ---------------------------------------- | ---------: | -------------------------------------- | ---------------------------------------------------------- | ------------- |
| Vitest (`src/**/*.{test,spec}.{ts,tsx}`) |        163 | `vitest.config.ts:14`                  | sim (`ci.yml:122`, `test.yml:42`, `pr-test-suite.yml:120`) | 🟨 PARCIAL    |
| Playwright (`tests/e2e/*.spec.ts`)       |         28 | `playwright.config.ts:20`              | sim, parcial (ver §4)                                      | 🟨 PARCIAL    |
| Cypress (`cypress/e2e/*.cy.ts`)          |         21 | `cypress.config.ts:7`                  | **nenhum workflow**                                        | ⬛ MORTO      |
| RLS SQL (`tests/rls/*.sql`)              |          4 | scripts `.mjs`                         | condicional a credenciais                                  | 🟨 PARCIAL    |
| Carga k6 (`tests/load/*.js`)             |          2 | `package.json` (`loadtest:cameras:k6`) | nenhum workflow                                            | 🟦 SUGERIDO   |
| Storybook (`.storybook/` + stories)      | 16 stories | `.storybook/main.ts:3`                 | `chromatic.yml` é stub                                     | ⬛ MORTO      |
| **TOTAL de arquivos de teste**           |    **212** |                                        |                                                            |               |

---

## 1. TESTE-ESPELHO — o teste reimplementa o alvo

**Medição:** dos 163 arquivos de teste em `src/`, **4 não importam nenhum módulo local**
(`@/…` ou `./…`) e portanto só podem estar testando código escrito dentro do próprio arquivo.

| arquivo                                            | linhas | `expect` | veredito                               | evidência                                                                                                                                                                                                                                                              |
| -------------------------------------------------- | -----: | -------: | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/test/lib/featureFlags.test.ts`                |    106 |        9 | 🟥 **espelho puro + alvo inexistente** | Declara a classe `FeatureFlagService` inteira dentro do `describe` (`:6-50`) e a testa. Comentário `// Import the class to create fresh instances` em `:3` seguido de **nenhum import**. `src/lib/featureFlags.ts` **não existe** no repositório.                      |
| `src/lib/insightface/__tests__/cache.test.ts`      |     25 |        4 | 🟥 **espelho declarado**               | `:5` — “_Mirrors supabase/functions/\_shared/insightface-cache.ts_”. `:7-9` define `cacheKey()` localmente. O alvo real `supabase/functions/_shared/insightface-cache.ts` **existe** e nunca é importado. Se o edge mudar o prefixo `if-enc:`, o teste continua verde. |
| `src/lib/insightface/__tests__/ttl-policy.test.ts` |     33 |        6 | 🟥 **espelho declarado**               | `:3` — “_TTL contract mirrored from edge-side helper_”. `:4-9` redeclara `NAMESPACE_TTL`. As 4 asserções (inclusive a de LGPD, `:27-31`) validam a constante local, não a de produção.                                                                                 |
| `src/test/hooks/hooks.test.ts`                     |    194 |       42 | 🟥 **espelho de 12 hooks**             | Zero imports locais. Nome promete testar hooks; nenhum hook de `src/hooks/` (180 arquivos) é importado.                                                                                                                                                                |

**Contraste — como é um teste correto do mesmo diretório:**
`src/lib/insightface/__tests__/similarity.test.ts:2` importa
`{ cosineSimilarity, cosineDistance, topKMatches } from '@/lib/insightface/similarity'` e o alvo
`src/lib/insightface/similarity.ts` existe. Esse protege. Os dois vizinhos, não.

### Reimplementação legítima (não é patologia)

`src/lib/devices/__tests__/ioSafety.simulation.test.ts:20` declara explicitamente
“_O `modelDecide` abaixo é uma reimplementação INDEPENDENTE da mesma regra_” — **e também importa
o alvo real**, comparando os dois. Isso é teste diferencial/metamórfico, não espelho. Idem
`src/lib/evidence/__tests__/custodyManifest.simulation.test.ts` e
`src/lib/devices/__tests__/pullPointLease.simulation.test.ts`.

### Resposta quantificada

**159 de 163 arquivos de teste em `src/` importam de fato pelo menos um módulo de produção.**
4 são espelhos. A patologia existe, mas é rara — o problema real desta suíte não é o espelho,
é o §5 (alvo órfão) e o §6 (ausência total de teste em páginas/hooks).

---

## 2. ALVO ÓRFÃO — o teste importa o alvo, mas nada em produção importa o alvo

Esta é a variante **dominante** e mais cara nesta base. O teste é honesto, importa o módulo real,
tem asserções reais — mas o módulo que ele protege **não é importado por nenhum arquivo de
produção**. O teste protege código que ninguém chama.

**Medição:** 35 dos 163 testes têm alvo primário com **zero importadores em produção**.

| teste                                                                             | alvo (0 importadores de produção)                   |
| --------------------------------------------------------------------------------- | --------------------------------------------------- |
| `src/lib/__tests__/zoneGeometry.test.ts`                                          | `src/lib/zoneGeometry.ts`                           |
| `src/lib/__tests__/resilience.test.ts`                                            | `src/lib/resilience.ts`                             |
| `src/lib/__tests__/cacheUtils.test.ts`                                            | `src/lib/cacheUtils.ts`                             |
| `src/lib/__tests__/dbHealthGuard.test.ts`                                         | `src/lib/dbHealthGuard.ts`                          |
| `src/lib/__tests__/clipRetention.test.ts`                                         | `src/lib/clipRetention.ts`                          |
| `src/lib/__tests__/snapshotAnnotator.test.ts`                                     | `src/lib/snapshotAnnotator.ts`                      |
| `src/lib/__tests__/relayLease.test.ts` / `relayVerdict` / `relayHealingArbiter`   | `src/lib/relay*.ts`                                 |
| `src/lib/__tests__/wizardTemplateRecommendation.test.ts`                          | `src/lib/wizardTemplateRecommendation.ts`           |
| `src/test/lib/dateUtils.test.ts`                                                  | `src/lib/dateUtils.ts`                              |
| `src/lib/alarms/__tests__/admissionBacklogAlert.test.ts`                          | `src/lib/alarms/admissionBacklogAlert.ts`           |
| `src/lib/alarms/__tests__/admissionOrphanAlert.test.ts`                           | `src/lib/alarms/admissionOrphanAlert.ts`            |
| `src/lib/alarms/__tests__/admissionTrendAlert.test.ts`                            | `src/lib/alarms/admissionTrendAlert.ts`             |
| `src/lib/alarms/__tests__/reconcileSnapshotRetention.test.ts`                     | `src/lib/alarms/reconcileSnapshotRetention.ts`      |
| `src/lib/devices/__tests__/onvifPullPointParse.test.ts`                           | `src/lib/devices/onvifPullPointParse.ts`            |
| `src/lib/devices/__tests__/commandSweep.test.ts`                                  | `src/lib/devices/commandSweep.ts`                   |
| `src/lib/devices/__tests__/connectivityFailureKind.test.ts`                       | `src/lib/devices/connectivityFailureKind.ts`        |
| `src/lib/collab/__tests__/collabRetention.test.ts`                                | `src/lib/collab/collabRetention.ts`                 |
| `src/lib/collab/__tests__/collabEntryLifecycle.test.ts`                           | `src/lib/collab/collabEntryLifecycle.ts`            |
| `src/lib/retention/__tests__/retentionAlerts.test.ts`                             | `src/lib/retention/retentionAlerts.ts`              |
| `src/lib/retention/__tests__/alarmRecurrenceRetention.test.ts`                    | `src/lib/retention/alarmRecurrenceRetention.ts`     |
| `src/lib/maintenance/__tests__/deliverabilityAlert.test.ts`                       | `src/lib/maintenance/deliverabilityAlert.ts`        |
| `src/components/vision/__tests__/VisionPipelineFleetCard.test.tsx`                | `src/components/vision/VisionPipelineFleetCard.tsx` |
| `src/components/ptz/lib/__tests__/calibrationRules.test.ts` + `.boundary.test.ts` | `src/components/ptz/lib/calibrationRules.ts`        |
| `src/__tests__/lib/collabNetwork.test.ts`                                         | `src/lib/collab/collabNetwork.ts`                   |
| `src/__tests__/lib/dwellTracker.test.ts`                                          | `src/lib/analytics/dwellTracker.ts`                 |
| `src/__tests__/lib/agentRestartBudget.test.ts`                                    | `src/lib/agentRestartBudget.ts`                     |
| `src/__tests__/lib/monitoringCenter.test.ts`                                      | `src/lib/integrations/monitoringCenter.ts`          |
| `src/__tests__/lib/suppressionRetention.test.ts`                                  | `src/lib/maintenance/suppressionRetention.ts`       |
| _(+ 6 outros, mesma assinatura)_                                                  |                                                     |

**Confirmação cruzada com o runtime:** os alvos órfãos mapeiam tabelas **vazias** em produção.
`dwellTracker` → `dwell_sessions` (0 linhas), `onvifPullPointParse` → `onvif_event_subscriptions`
(0 linhas), `commandSweep` → `device_remote_commands` (0 linhas), `collabEntryLifecycle` →
`collab_entries` (0 linhas) — todas na lista de 108 tabelas vazias
(`_FATOS_RUNTIME.md:63-89`). A suíte testa com rigor um subsistema que nunca rodou.

**Classificação:** 🟨 PARCIAL — o teste é tecnicamente válido (importa, assere), mas o que ele
protege é código dormente. Verde não significa sistema protegido.

---

## 3. SUÍTE DESLIGADA

**Não há um único `describe.skip`, `it.skip` estático, `test.todo`, `xit` ou `xdescribe` em
todo o repositório.** Verificação: `grep -rE '\.(skip|todo|failing)\b|xit\(|xdescribe\('` em
`src/`, `tests/`, `cypress/`.

O que existe é pior e mais difícil de detectar: **auto-desligamento condicional em runtime**.
São 9 specs Playwright + 1 helper que chamam `test.skip(condição, motivo)` — o teste some do
relatório como “skipped” em vez de falhar, e a suíte fica verde.

| arquivo:linha                                          | condição do skip                                                           | o que fica desprotegido                                 | justificativa escrita?                                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| `tests/e2e/helpers/authSession.ts:331`                 | sem `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` e sem `tests/e2e/.auth/user.json` | **toda rota autenticada** que use `gotoAuthenticated()` | sim, `:19-21` — “cobertura garantida pelas camadas estáticas” |
| `tests/e2e/rtsp-live-preview.spec.ts:22,108`           | `skipReason` (falta Supabase URL/anon key, `:10-11`)                       | 9 casos de preview RTSP ao vivo                         | parcial                                                       |
| `tests/e2e/rtsp-live-preview-ui.spec.ts:38`            | `!ready` (sessão indisponível)                                             | 5 casos de UI do player (21 asserções)                  | sim                                                           |
| `tests/e2e/rtsp-live-preview-resilience.spec.ts:34`    | `!ready`                                                                   | 4 casos de resiliência (20 asserções)                   | sim                                                           |
| `tests/e2e/alertmanager-silence.spec.ts:21`            | `skipReason` (`:11-12`)                                                    | 4 casos de silenciamento de alertas (9 asserções)       | parcial                                                       |
| `tests/e2e/mobile-drawer.spec.ts:41`                   | `!ready`                                                                   | 7 casos do drawer (23 asserções)                        | sim                                                           |
| `tests/e2e/mobile-nav-measured-overlap.spec.ts:39,57`  | `!ready`                                                                   | medição real de sobreposição da bottom-nav              | sim — “cobertura estática garante o contrato”                 |
| `tests/e2e/mobile-nav-visual.spec.ts:64`               | rota exige auth                                                            | baselines visuais das rotas autenticadas                | sim — “coberta por checagem estática”                         |
| `tests/e2e/mobile-nav-multi-viewport-theme.spec.ts:78` | rota exige auth                                                            | matriz viewport × tema em rotas autenticadas            | sim                                                           |
| `tests/e2e/mobile-nav-class-presence.spec.ts:64`       | `MOBILE_NAV_CLASS_AUTH_BYPASS=1` (`:43`)                                   | presença da classe da nav em rotas autenticadas         | sim                                                           |

### O agravante: o CI liga o bypass explicitamente

`.github/workflows/ci.yml:94` define `MOBILE_NAV_CLASS_AUTH_BYPASS: '1'` no step
“Mobile Nav Class Presence (**build gate**)”. Em `authSession.ts:294`, `allowSkip = true`
força `shouldFail = false` (`:305`) — **esse gate nunca pode reprovar por falta de auth**.

`.github/workflows/e2e-playwright.yml:76-86` vai além: o step “Guard required secrets” detecta
segredos ausentes e emite apenas `::warning::` — “_Testes autenticados serão pulados (skip)_”.
O job segue e termina verde.

A única variável que converte skip em falha é `E2E_AUTH_REQUIRED=1` (`authSession.ts:26-28`),
usada em **um único script** — `package.json` `test:e2e:ci` — que **nenhum workflow invoca**.

**Consequência auditável:** uma execução verde de `e2e.yml` ou `e2e-playwright.yml` sem segredos
configurados significa **zero testes autenticados executados**. O relatório não distingue
“passou” de “não rodou”.

**Classificação:** 🟨 PARCIAL, com risco de leitura falsamente positiva.

---

## 4. SEM RUNNER — arquivos de teste que nenhum pipeline executa

### 4.1 Cypress — 21 specs, ⬛ MORTO

`cypress.config.ts:7` declara `specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'` e os 21 specs
existem. `package.json` declara `cypress:run`, `e2e`, `e2e:ci`, `test:e2e`.

**Nenhum dos 43 workflows em `.github/workflows/` invoca cypress.** As duas únicas ocorrências
da string no diretório `.github/` são:

- `.github/labeler.yml:7` — regra de rotulagem de PR;
- `.github/dependabot.yml:41` — grupo de atualização de dependência.

O `.husky/pre-commit` e `.husky/pre-push` também não rodam cypress (só `type-check:strict` e
`lint:ci`, este último com fallback `|| echo` — não bloqueante).

Ou seja: **21 arquivos, 160 casos `it`, nunca executados por ninguém desde que existem.**

### 4.2 Cypress — o alvo também não existe (patologia composta)

Ainda que alguém rodasse a suíte, ela não poderia passar:

| medição                                                   | resultado         |
| --------------------------------------------------------- | ----------------- |
| `data-testid` distintos referenciados pelos specs Cypress | **139**           |
| `data-testid` distintos existentes em `src/`              | 59                |
| referenciados pelo Cypress **que existem** em `src/`      | **1** (`sidebar`) |
| referenciados pelo Cypress **ausentes** de `src/`         | **138**           |

Exemplos de seletores inexistentes: `cameras-grid`, `camera-card`, `camera-modal`, `add-zone`,
`zone-editor`, `email-input`, `password-input`, `login-button`, `stats-card`, `alerts-list`,
`add-person`, `analyze-plate`, `2fa-prompt`.

Somam-se dois erros de premissa:

- **Rota inexistente.** `cypress/support/commands.ts:11` faz `cy.visit('/login')`. `src/App.tsx:194`
  registra `/login` apenas como `<Navigate to="/auth" replace />`. O comando `cy.login()` — usado
  por `full-workflow.cy.ts:30`, `:45`, e outros — quebra na primeira linha.
- **API inexistente.** `cypress/e2e/full-workflow.cy.ts:8-9` intercepta `GET /api/cameras` e
  `GET /api/alerts`. O app é cliente Supabase direto; não há rota `/api/*` em `src/`
  (única ocorrência: `src/middleware/ipWhitelist.ts:155`, `/api/check-ip`). Os
  `cy.wait('@getCameras')` (`:35`, `:52`) esperariam indefinidamente.

**Classificação: ⬛ MORTO.** Suíte escrita contra uma aplicação que não é esta. Sem runner, sem
seletores, sem rotas, sem API. Zero valor de proteção; valor negativo de manutenção (aparece nos
inventários como “21 testes E2E”).

### 4.3 `vitest.setup.ts` (raiz) — ⬛ MORTO

`vitest.config.ts:13` declara `setupFiles: ['./src/test/setup.ts']`. O arquivo
`vitest.setup.ts` na raiz **não é referenciado por nenhum arquivo de configuração, script ou
workflow** (única menção no repo: `graphify-out/manifest.json:6772`, um artefato de análise).

Os mocks que ele define e que **não estão** em `src/test/setup.ts` estão, portanto, inativos:

- `IntersectionObserver` (`vitest.setup.ts:20-28`)
- `ResizeObserver` (`:31-39`)
- `window.scrollTo` (`:42-45`)
- `localStorage` / `sessionStorage` (`:48-61`)
- supressão de `console.error` / `console.warn` (`:64-65`)

`src/test/setup.ts` cobre apenas `jest-dom`, `matchMedia`, `isSecureContext` e `crypto.webcrypto`.
Qualquer teste que renderize componente dependente de `ResizeObserver`/`IntersectionObserver`
depende de mock local próprio, não do arquivo da raiz.

### 4.4 Scripts npm que apontam para diretórios inexistentes

| script (`package.json`)                                        | aponta para                 | existe? |
| -------------------------------------------------------------- | --------------------------- | ------- |
| `test:unit: vitest run --dir src/__tests__/unit`               | `src/__tests__/unit`        | **não** |
| `test:integration: vitest run --dir src/__tests__/integration` | `src/__tests__/integration` | **não** |

`src/__tests__/` contém apenas `components/` e `lib/`.

`.github/workflows/pr-verify.yml:79-83` executa `bun run test:unit` com
`continue-on-error: true` e o comentário: _“test:unit aponta para src/\_\_tests\_\_/unit/ que não
existe — bug pré-existente”_. O bug é **conhecido, documentado e mantido**: o step existe, roda,
não encontra teste algum, e não bloqueia. É um step de teste que nunca testou nada.

### 4.5 `tests/load/` — 🟦 SUGERIDO

`tests/load/k6-camera-previews.js` e `k6-load-test.js` só são acionáveis por
`npm run loadtest:cameras:k6` (`k6 run …`). Nenhum workflow chama. Há 10 relatórios
`tests/load/reports/camera-load-*.{json,md}` commitados — evidência de execução manual pontual,
não de gate contínuo.

### 4.6 `tests/rls/` — 🟨 PARCIAL

4 arquivos SQL (`cameras.sql`, `capability-grant-console.sql`,
`connectivity-path-evidence.sql`, `dba-privileges.sql`), consumidos por runners `.mjs`
(`scripts/check-grant-console.mjs:51`, `scripts/check-dba-privileges.mjs:3`,
`scripts/check-path-evidence.mjs:94`), agregados em `npm run db:check:all`.

Invocado por `.github/workflows/pr-test-suite.yml:322` — **porém sob
`if: steps.creds.outputs.available == 'true'`** (`:318`). Sem credenciais de banco no PR, o job
inteiro de guardrails é pulado e o gate agregado (`:365` “Suíte completa aprovada”) não distingue
“passou” de “não rodou”. Cobertura declarada: 4 arquivos SQL para **406 policies RLS** em
**169 tabelas** (`_FATOS_RUNTIME.md:10`).

---

## 5. ASSERÇÃO VACUAMENTE VERDADEIRA

### 5.1 Vitest — o corpo está saudável

| medição                                          | resultado        |
| ------------------------------------------------ | ---------------- |
| arquivos de teste em `src/`                      | 163              |
| casos `it`/`test`                                | 1.644            |
| chamadas `expect(`                               | 3.452            |
| média de asserções por caso                      | **2,1**          |
| arquivos com **zero** `expect`                   | **0**            |
| arquivos com menos de 1 `expect` por caso        | **0**            |
| `expect(true).toBe(true)` ou `expect(x).toBe(x)` | **1 ocorrência** |

A única ocorrência trivialmente verdadeira: `src/components/ui/__tests__/variant-props.test.tsx:121`
— `expect(true).toBe(true)`.

Nenhuma asserção em `src/` depende de variável de ambiente indefinida (`process.env` /
`import.meta.env` não aparece em nenhum `*.test.ts(x)` de `src/`).

**Veredito parcial: a suíte Vitest NÃO sofre de asserção vazia.** Quando roda, ela assere de
verdade. O problema dela é _sobre o quê_ ela assere (§2 e §6), não _se_ assere.

### 5.2 Playwright — asserções sob guarda condicional

O padrão `if (await elemento.isVisible()) { … expect(…) }` faz o caso passar **sem executar
asserção alguma** quando o elemento não aparece.

| spec                                       | `expect` totais | sob guarda condicional |
| ------------------------------------------ | --------------: | ---------------------: |
| `tests/e2e/critical-paths.spec.ts`         |              23 |                  **4** |
| `tests/e2e/auth.spec.ts`                   |               7 |                  **3** |
| `tests/e2e/navigation.spec.ts`             |               9 |                  **3** |
| `tests/e2e/auth-routes-mobile-nav.spec.ts` |              21 |                      2 |
| demais 22 specs                            |             128 |                      0 |

Exemplo integral — `tests/e2e/critical-paths.spec.ts:22-41`, caso
`should show password strength indicator on signup`: **três** guardas aninhadas
(`if (await signupTab.first().isVisible())` → `if (await passwordInput.isVisible())`) antes do
único `expect` da linha `:39`. Se a aba de cadastro sumir da UI, o teste que existe justamente
para proteger o indicador de força de senha passa em silêncio.

Mesmo padrão em `:44-54` (validação de e-mail vazio) e `:56-71` (credencial inválida): o `expect`
é `expect(page.url()).not.toContain('/dashboard')` — que também é verdadeiro quando a página nem
carregou.

### 5.3 Specs Playwright com zero `expect`

- `tests/e2e/qa-console-sweep.spec.ts` — 2 casos, 0 asserções. É coletor de telemetria de console,
  não teste; o julgamento fica em `scripts/build-qa-console-report.mjs`.
- `tests/e2e/qa-visual-snapshots.spec.ts` — 1 caso, 0 asserções. Gera artefato visual.

Ambos válidos como ferramenta, **inválidos como proteção**. Contam como “2 specs E2E” em qualquer
inventário e não podem reprovar nada.

### 5.4 Cypress — asserções presentes, alvo ausente

17 dos 21 specs Cypress têm zero `expect(` — mas usam `.should()`, que **é** asserção Cypress
válida (ex.: `cypress/e2e/cameras.cy.ts:7`). Não é patologia de asserção. É patologia de §4.2:
as asserções apontam para seletores inexistentes.

---

## 6. ALVO INEXISTENTE — teste que aponta para código removido

| teste                                           | alvo declarado                        | situação                                                                                               |
| ----------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/test/lib/featureFlags.test.ts`             | `src/lib/featureFlags.ts`             | **arquivo não existe** — o teste sobrevive porque reimplementou a classe (§1)                          |
| `src/lib/insightface/__tests__/cache.test.ts`   | `src/lib/insightface/cache.ts`        | **não existe**; o alvo real está em `supabase/functions/_shared/insightface-cache.ts`, nunca importado |
| `cypress/support/commands.ts:11` (`cy.login`)   | rota `/login`                         | redirecionada para `/auth` em `src/App.tsx:194`                                                        |
| `cypress/e2e/full-workflow.cy.ts:8-9`           | `GET /api/cameras`, `GET /api/alerts` | rotas `/api/*` não existem na aplicação                                                                |
| 138 seletores `data-testid` do Cypress          | elementos em `src/`                   | ausentes (§4.2)                                                                                        |
| `package.json` `test:unit` / `test:integration` | `src/__tests__/{unit,integration}`    | diretórios não existem (§4.4)                                                                          |

---

## 7. LIMIARES: `coverage-baseline.json` e `quality-gates.config.json`

### 7.1 `coverage-baseline.json` — 🟨 gate real, mas travado no chão

| campo                       | valor       | efeito                                                                                                              |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `tolerancePp` (`:4`)        | 0,5         | queda > 0,5 pp reprova                                                                                              |
| `metrics.statements` (`:6`) | 7,92        | patamar congelado                                                                                                   |
| `floors`                    | **ausente** | `scripts/check-coverage-baseline.mjs:131` → `floors = null`; o bloco “piso absoluto” (`:180-187`) **nunca dispara** |

**Onde é aplicado, de forma bloqueante:** `.github/workflows/pr-test-suite.yml:136-138` —
step “Gate de regressão de cobertura”, `npm run coverage:check`, sem `continue-on-error`.
O script sai com `exit 1` em regressão (`check-coverage-baseline.mjs:198-199`). **Este gate é real.**

**Onde é decorativo:** `.github/workflows/coverage.yml:44-49` roda `npm run coverage` com
`COVERAGE_FAIL_ON_DROP: ${{ vars.COVERAGE_FAIL_ON_DROP || '0' }}` — **padrão `0`, não falha**.
Produz comentário de PR bonito (`:159-177`) que informa a queda sem impedi-la.

**Escape hatch documentado:** o próprio script instrui, em `:193-194`, que “se a queda for
intencional, rode `npm run coverage:baseline` e commite o `coverage-baseline.json`”. Existe o
script `coverage:baseline` no `package.json`. Rebaixar o gate é uma linha de comando.

**Leitura:** é um catraca (_ratchet_) que impede piorar 0,5 pp por vez, ancorada em 7,92 %, sem
piso obrigatório e com destravamento de uma linha. Não é um gate de qualidade; é um gate
anti-deterioração-abrupta.

### 7.2 `quality-gates.config.json` — ⬛ MORTO

O arquivo define limiares estritos e defensáveis:

| perfil          | lint                    | typecheck                       | vitest                        |
| --------------- | ----------------------- | ------------------------------- | ----------------------------- |
| `dev` (`:5-18`) | ≤ 25 warnings, 0 erros  | 0 erros, `tsconfig.json`        | 0 falhas, ≥ 95 % pass rate    |
| `ci` (`:19-32`) | **0 warnings**, 0 erros | 0 erros, `tsconfig.strict.json` | **0 falhas, 100 % pass rate** |

O executor `scripts/quality-gates.mjs` é real e bloqueante: lê o config (`:30`), compara
`maxFailures` e `minPassRate` (`:170-175`) e termina com `process.exit(allPassed ? 0 : 1)` (`:293`).

**Nenhum workflow, nenhum hook Husky e nenhum Makefile invoca `qa:gates`, `qa:gates:ci`,
`qa:gates:dev` ou `scripts/quality-gates.mjs`.** As únicas ocorrências da string no repositório
fora do próprio script são as três definições em `package.json:120-122` e um caminho de artefato
em `.github/workflows/pr-verify.yml:128` (`reports/quality-gates/**` — coleta um relatório que
nada produziu).

**Classificação: ⬛ MORTO.** Config correto + script correto + zero invocação = zero efeito.
O perfil `ci` com “100 % pass rate” nunca foi aplicado a nada.

### 7.3 Amortecedor de falha: `vitest-flaky-retry.mjs`

`.github/workflows/pr-test-suite.yml:120` substitui `vitest run` por
`node scripts/vitest-flaky-retry.mjs`. O script (`:34-35`) tolera, por padrão:

- `FLAKY_MAX_RETRIES = 2` — cada arquivo que falha é reexecutado até 2 vezes;
- `FLAKY_MAX_ALLOWED = 5` — até **5 testes flaky** passam sem reprovar o job.

Um teste que falha na primeira execução e passa no retry é classificado como flaky e **não
reprova** (`:187-192`). Isso contradiz frontalmente `quality-gates.config.json:29-30`
(`maxFailures: 0`, `minPassRate: 1.0`) — que, como visto em §7.2, não é aplicado.

### 7.4 Outros amortecedores em CI

| local                        | mecanismo                                                 | efeito                                    |
| ---------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| `ci.yml:64-65`               | ESLint comentado (`# - name: ESLint (zero warnings)`)     | gate de lint desligado no CI principal    |
| `ci.yml:98`                  | `continue-on-error: true` em Mobile Nav Overlap           | regressão visual não reprova              |
| `ci.yml:104`                 | `continue-on-error: true` em Mobile Nav Visual Regression | idem                                      |
| `test.yml:28-29`             | `npm run lint` com `continue-on-error: true`              | idem                                      |
| `pr-verify.yml:76-77`        | `bun run lint` com `continue-on-error: true`              | idem                                      |
| `pr-verify.yml:82-83`        | `bun run test:unit` com `continue-on-error: true`         | step de teste sobre diretório inexistente |
| `a11y-axe.yml:29`            | `continue-on-error: true` no axe-core                     | violação de acessibilidade não reprova    |
| `.husky/pre-commit:23`       | `lint:ci \|\| echo "…"`                                   | hook local não bloqueia                   |
| `.husky/pre-push:20`         | `lint:ci \|\| echo "…"`                                   | idem                                      |
| `package.json` `test:ci`     | `vitest run --passWithNoTests`                            | execução sem teste algum sai verde        |
| `package.json` `coverage:ci` | `vitest run --coverage --passWithNoTests`                 | idem                                      |

### 7.5 Workflows-fantasma — 8 pipelines que imprimem ✅ sem executar nada

Oito workflows compartilham o mesmo corpo idêntico de 25 linhas:

```yaml
- run: npm install --ignore-scripts || npm install --force || true
  continue-on-error: true
- run: npm run build || true
  continue-on-error: true
- if: always()
  run: echo '## ✅ <NOME> completed' >> $GITHUB_STEP_SUMMARY
```

| workflow                                        | promete                       | executa |
| ----------------------------------------------- | ----------------------------- | ------- |
| `.github/workflows/chromatic.yml:20-25`         | regressão visual de Storybook | nada    |
| `.github/workflows/visual-regression.yml:20-25` | regressão visual              | nada    |
| `.github/workflows/accessibility.yml:20-25`     | testes de acessibilidade      | nada    |
| `.github/workflows/performance.yml:20-25`       | testes de performance         | nada    |
| `.github/workflows/lighthouse.yml:20-25`        | Lighthouse CI                 | nada    |
| `.github/workflows/bundle-size.yml:20-25`       | orçamento de bundle           | nada    |
| `.github/workflows/size.yml:20-25`              | check de tamanho              | nada    |
| `.github/workflows/feature-flags.yml:20-25`     | validação de feature flags    | nada    |
| `.github/workflows/e2e-coverage.yml:20-25`      | cobertura E2E                 | nada    |

Nove ao todo, contando `e2e-coverage.yml`. Todos terminam verdes por construção — `|| true` em
cada comando e `if: always()` no resumo. Nenhum consegue falhar.

**Classificação: ⬛ MORTO — teatro de CI.** Nove checks verdes por PR que não verificam nada.

### 7.6 Storybook / Chromatic — ⬛ MORTO

`.storybook/main.ts:3` aponta para `../src/**/*.stories.@(js|jsx|mjs|ts|tsx)`. Existem **16
stories** para 615 componentes (2,6 %). `package.json` tem `build-storybook` e `storybook`.
O único workflow que menciona Chromatic é o stub de §7.5. Nenhuma story é renderizada, comparada
ou publicada em CI.

---

## 8. COBERTURA POR DIMENSÃO — com denominador

| dimensão                                 |        denominador (fato medido) |                                                  com teste |          % |
| ---------------------------------------- | -------------------------------: | ---------------------------------------------------------: | ---------: |
| Módulos de produção `src/`               |                            1.185 |                         160 alcançados por import de teste | **13,5 %** |
| Instruções `src/` (baseline declarada)   |                            100 % |                                                     7,92 % |  **7,9 %** |
| Páginas (`src/pages`)                    |                               89 |                                                          0 |    **0 %** |
| Hooks (`src/hooks`)                      |                              180 |                                                          2 |  **1,1 %** |
| Componentes (`src/components`)           |                              615 |                                                         31 |  **5,0 %** |
| Contexts / Providers                     |                               22 |                                                          1 |      4,5 % |
| Edge functions (`supabase/functions/*/`) |                           **75** |                                     6 com arquivo de teste |  **8,0 %** |
| Edge functions cujo teste o CI executa   |                               75 |                    0 (só `_shared/__tests__/`, 5 arquivos) |    **0 %** |
| Migrations (`supabase/migrations/*.sql`) |                          **361** |                                                          0 |    **0 %** |
| Policies RLS em produção                 | **406** (`_FATOS_RUNTIME.md:10`) |                       4 arquivos SQL, execução condicional |      ≈ 0 % |
| Funções PL/pgSQL em produção             | **386** (`_FATOS_RUNTIME.md:10`) |                                                          0 |    **0 %** |
| Triggers em produção                     |                          **113** |                                                          0 |    **0 %** |
| Jobs `pg_cron` ativos                    |  **69** (`_FATOS_RUNTIME.md:23`) | 0 teste; `cron_watchdog_runs` é observabilidade, não teste |    **0 %** |
| Stories Storybook                        |                  615 componentes |                                                         16 |      2,6 % |

### 8.1 Edge functions — detalhamento

`.github/workflows/pr-test-suite.yml:76-77` executa exatamente:
`deno test --allow-all supabase/functions/_shared/__tests__/` — os 5 arquivos daquele diretório
(`contractValidation_test.ts`, `failureBlame_test.ts`, `maskSecrets_test.ts`,
`networkError_test.ts`, `webhookContractTests_test.ts`).

Ficam **fora do caminho** e portanto sem runner:

| arquivo de teste                                                        | motivo                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `supabase/functions/_shared/zoneMatcher.test.ts`                        | está em `_shared/`, não em `_shared/__tests__/`                     |
| `supabase/functions/_shared/mediamtxPath.test.ts`                       | idem                                                                |
| `supabase/functions/admin-slow-queries/index.test.ts`                   | fora do path do `deno test`; fora do `include` do Vitest (`src/**`) |
| `supabase/functions/camera-ptz-control/parsePtzStatus_test.ts`          | idem                                                                |
| `supabase/functions/health/index.test.ts`                               | idem                                                                |
| `supabase/functions/run-retention/index.test.ts`                        | idem                                                                |
| `supabase/functions/replay-rule-execution/validation_test.ts`           | idem                                                                |
| `supabase/functions/validate-rtsp-stream/criticalAlert.test.ts`         | idem                                                                |
| `supabase/functions/validate-rtsp-stream/__tests__/sdp.test.ts`         | idem                                                                |
| `supabase/functions/validate-rtsp-stream/__tests__/suggestions.test.ts` | idem                                                                |

**10 arquivos de teste de edge function sem runner.** ⬛

Contexto de risco: `edge_function_error_audit` tem **90.462 linhas** — é a maior tabela de dados
do sistema (`_FATOS_RUNTIME.md:33`). A camada que mais erra em produção é a que tem 0 % de teste
executado em CI.

### 8.2 Migrations — 0 de 361

Não existe teste de migration. O único controle é estático:
`scripts/lint-migrations.mjs` (via `npm run check:migrations`, aplicado de forma bloqueante em
`ci.yml:44` e `pr-test-suite.yml:67`), que valida RLS + GRANT + `search_path` no **texto** do SQL.

Nenhum pipeline aplica migration em banco efêmero, nem verifica idempotência, nem reversão.
Combinado com o drift crítico de `_FATOS_RUNTIME.md:12-19` (361 arquivos no repo × **3 linhas**
em `schema_migrations`), a conclusão é direta: **não há teste algum capaz de detectar que o
schema vivo divergiu do repositório.** ⬛

---

## 9. E2E: fluxo real ou smoke?

### 9.1 Playwright — 28 specs, forte em _chrome de UI_, fraco em negócio

| foco                                            | specs |        % |
| ----------------------------------------------- | ----: | -------: |
| Navegação mobile / bottom-nav / drawer (layout) |     9 |     32 % |
| Acessibilidade / visual / CLS / performance     |     7 |     25 % |
| Coletores sem asserção (`qa-*`)                 |     2 |      7 % |
| Smoke de páginas / navegação client-side        |     3 |     11 % |
| Auth (formulário, proteção de rota)             |     2 |      7 % |
| **Fluxo de negócio real**                       | **5** | **18 %** |

Os 5 de negócio: `rtsp-live-preview.spec.ts`, `rtsp-live-preview-ui.spec.ts`,
`rtsp-live-preview-resilience.spec.ts` (preview RTSP), `ptz-recapture-adversarial.spec.ts`
(recaptura PTZ, 11 interações reais), `alertmanager-silence.spec.ts` (silenciamento).
**Quatro desses cinco estão na lista de auto-skip do §3.**

Não há spec E2E para: cadastro/edição de câmera, criação de zona, reconhecimento facial,
leitura de placa, exportação de evidência, gravações, relatórios, esquemas de alarme, colaboração.

`tests/e2e/critical-paths.spec.ts` — o nome promete caminhos críticos; os 21 casos são, na prática,
verificações de layout (`scrollWidth <= clientWidth`, `:121/:137/:147/:157`), a11y estrutural
(`lang`, `h1`, `alt`, `:203-232`), performance (`loadTime < 5000`, `:258`; `cls < 0.25`, `:282`) e
higiene de HTML (`:293-304`). Apenas 4 casos tocam autenticação, todos sob guarda condicional (§5.2).

**Veredito: smoke sofisticado + regressão visual de layout mobile. Não é E2E de fluxo de negócio.**

### 9.2 Cypress — cobria fluxo real _no papel_

Os 21 specs Cypress _descrevem_ exatamente o que falta no Playwright: `cameras.cy.ts`,
`zones.cy.ts`, `face-recognition.cy.ts`, `license-plate.cy.ts`, `recordings.cy.ts`,
`reports.cy.ts`, `multi-camera.cy.ts`, `real-time-alerts.cy.ts`, `offline-mode.cy.ts`,
`full-workflow.cy.ts`. 160 casos `it`.

E nenhum deles funciona nem roda (§4.1 + §4.2). **A cobertura de fluxo de negócio deste sistema
é exatamente zero, com 21 arquivos ocupando o lugar dela no inventário.**

---

## 10. CLASSIFICAÇÃO CONSOLIDADA

| #   | área / suíte                                               | classificação               | justificativa (evidência)                                                                                           |
| --- | ---------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Vitest `src/lib/**` (98 arquivos)                          | 🟨 **PARCIAL**              | importa alvos reais, 2,1 asserções/caso, roda em 3 workflows; **mas 35 alvos são módulos órfãos** (§2)              |
| 2   | Vitest `src/components/**` (27 arquivos)                   | 🟨 **PARCIAL**              | 31 de 615 componentes tocados (5,0 %)                                                                               |
| 3   | Vitest `src/pages`                                         | ⬛ **MORTO**                | 0 testes para 89 páginas                                                                                            |
| 4   | Vitest `src/hooks`                                         | ⬛ **MORTO**                | 2 de 180; `useCameras` só existe como mock (`AutomationRulesManager.test.tsx:26`)                                   |
| 5   | Vitest `src/contexts`, `src/integrations`, `src/config`    | ⬛ **MORTO**                | 0 testes                                                                                                            |
| 6   | `src/test/lib/featureFlags.test.ts`                        | ⬛ **MORTO**                | espelho + alvo inexistente (§1)                                                                                     |
| 7   | `src/lib/insightface/__tests__/{cache,ttl-policy}.test.ts` | ⬛ **MORTO**                | espelho declarado (§1)                                                                                              |
| 8   | `src/test/hooks/hooks.test.ts`                             | ⬛ **MORTO**                | zero imports locais (§1)                                                                                            |
| 9   | Playwright — nav mobile / visual (9 specs)                 | ✅ **IMPLEMENTADO_TOTAL**   | importa alvo (a app real), assere, e `ci.yml:86/91/97/103` executa. Ressalva: 2 dos 4 steps com `continue-on-error` |
| 10  | Playwright — smoke de páginas (3 specs)                    | ✅ **IMPLEMENTADO_TOTAL**   | `ci.yml:117`, `pr-test-suite.yml:266`, sem `continue-on-error`                                                      |
| 11  | Playwright — fluxo de negócio (5 specs)                    | 🟨 **PARCIAL**              | 4 dos 5 auto-skipam sem segredos (§3)                                                                               |
| 12  | Playwright — a11y axe                                      | 🟨 **PARCIAL**              | `a11y-axe.yml:29` com `continue-on-error: true`                                                                     |
| 13  | Playwright — `qa-console-sweep`, `qa-visual-snapshots`     | 🟦 **SUGERIDO_OU_INICIADO** | 0 asserções; coletores de artefato                                                                                  |
| 14  | **Cypress (21 specs, 160 casos)**                          | ⬛ **MORTO**                | sem runner em 43 workflows; 138/139 seletores inexistentes; `/login` e `/api/*` inexistentes (§4.1-4.2)             |
| 15  | `vitest.setup.ts` (raiz)                                   | ⬛ **MORTO**                | não referenciado; `vitest.config.ts:13` usa `src/test/setup.ts` (§4.3)                                              |
| 16  | `quality-gates.config.json`                                | ⬛ **MORTO**                | config + script válidos, **zero invocação em CI** (§7.2)                                                            |
| 17  | `coverage-baseline.json`                                   | 🟨 **PARCIAL**              | bloqueante em `pr-test-suite.yml:138`; sem `floors`; ancorado em 7,92 % (§7.1)                                      |
| 18  | `.storybook/` + `chromatic.yml`                            | ⬛ **MORTO**                | 16 stories; workflow é stub (§7.6)                                                                                  |
| 19  | 9 workflows-fantasma                                       | ⬛ **MORTO**                | `\|\| true` + `if: always()` → verde por construção (§7.5)                                                          |
| 20  | `tests/rls/*.sql`                                          | 🟨 **PARCIAL**              | executa só com credenciais (`pr-test-suite.yml:318`); 4 arquivos p/ 406 policies                                    |
| 21  | `tests/load/k6-*.js`                                       | 🟦 **SUGERIDO_OU_INICIADO** | script npm existe, nenhum workflow chama                                                                            |
| 22  | Edge functions `_shared/__tests__` (5 arq.)                | ✅ **IMPLEMENTADO_TOTAL**   | `pr-test-suite.yml:77`, `deno test`, sem `continue-on-error`                                                        |
| 23  | Edge functions — 10 testes fora do path                    | ⬛ **MORTO**                | nenhum runner os alcança (§8.1)                                                                                     |
| 24  | Migrations (361)                                           | ⬛ **MORTO**                | 0 testes; só lint textual (§8.2)                                                                                    |
| 25  | Funções PL/pgSQL (386), triggers (113), cron (69)          | ⬛ **MORTO**                | 0 testes                                                                                                            |

**Resumo:** 4 áreas ✅ · 8 áreas 🟨 · 2 áreas 🟦 · **11 áreas ⬛**.

---

## 11. AS TRÊS CONCLUSÕES QUE IMPORTAM

1. **A suíte Vitest é honesta e bem escrita — e mira no lugar errado.** 159 de 163 arquivos
   importam o alvo real e assereram de verdade (2,1 asserções/caso, zero arquivos sem `expect`).
   Mas 68 % da atenção está em `src/lib`, 35 alvos são módulos que produção nenhuma importa, e
   0 das 89 páginas e 178 dos 180 hooks não têm nada. O esforço existe; a mira, não.

2. **O verde do CI não é evidência de nada em três frentes distintas.**
   (a) 9 workflows imprimem ✅ sem executar comando algum (§7.5).
   (b) A camada E2E autenticada se auto-desliga como _skipped_ quando faltam segredos, e o CI
   liga o bypass explicitamente em `ci.yml:94` (§3).
   (c) O executor de gate mais estrito do repositório — `quality-gates.config.json`, perfil `ci`,
   0 falhas / 100 % pass rate — nunca é invocado por pipeline algum (§7.2).

3. **A cobertura de fluxo de negócio é zero, e há 21 arquivos ocupando o lugar dela.**
   O Playwright cobre layout mobile, a11y e smoke. O Cypress — que descreve câmeras, zonas, faces,
   placas, gravações, relatórios — não roda em nenhum pipeline e, se rodasse, falharia na primeira
   linha: 138 dos 139 seletores que usa não existem em `src/`, e a rota `/login` e a API `/api/*`
   que ele assume também não. Um inventário superficial contaria “212 testes”. A contagem
   defensável de proteção de negócio é **0**.

---

## Lacunas desta auditoria

Declaração explícita das fronteiras do que foi apurado:

1. **NENHUM TESTE FOI EXECUTADO.** `node_modules` não está instalado
   (`_FATOS_RUNTIME.md:93`). Não rodei `vitest`, `playwright`, `cypress`, `deno test`, `k6`,
   nem qualquer script de `scripts/`. **Nada neste documento afirma que um teste passa ou falha.**
   Onde o texto diz “passa em silêncio”, “fica verde” ou “não reprova”, trata-se de leitura
   estática do fluxo de controle do código do teste e do YAML do workflow, não de observação.

2. **A cobertura de 7,92 % não foi medida por mim.** É o valor gravado em
   `coverage-baseline.json:6`, datado de 2026-07-26 (`:3`). Pode estar defasado. Meu número
   independente é o estrutural (13,5 % dos módulos alcançados por import de teste), obtido por
   resolução estática de `import`/`from`/`import()` com os aliases de `vitest.config.ts:60`.

3. **A resolução de imports é estática e conservadora.** Imports dinâmicos com caminho
   computado, re-exports em barris `index.ts` de vários níveis e injeção via `vi.mock` com
   _factory_ podem fazer um módulo parecer órfão (§2) quando é alcançado por via indireta.
   O número 35 é um limite superior de suspeita, não uma certeza por item. Spot-checks manuais
   confirmaram 7 casos (`zoneGeometry`, `resilience`, `cacheUtils`, `dbHealthGuard`,
   `calibrationRules`, `dateUtils`, `VisionPipelineFleetCard`): **0 importadores de produção**.

4. **A contagem de `data-testid` compara strings literais.** Seletores construídos
   dinamicamente em `src/` (`data-testid={\`card-${id}\`}`) não entram no denominador de 59.
A conclusão de §4.2 (138 ausentes) é robusta pela ordem de grandeza e pelos exemplos
verificados individualmente (`cameras-grid`, `email-input`, `add-zone`), não pela precisão do
   número exato.

5. **Não avaliei o histórico de execução do CI.** Não consultei GitHub Actions. Se um workflow
   está desabilitado na UI, se um `required check` está configurado em branch protection, ou se
   os segredos `E2E_TEST_*` de fato existem no repositório — nada disso é visível a partir dos
   arquivos. Toda afirmação sobre “bloqueante” ou “não bloqueante” deriva exclusivamente de
   `continue-on-error`, `|| true`, `if:` e código de saída dos scripts.

6. **`scripts/` está fora do meu escopo declarado.** Li `check-coverage-baseline.mjs`,
   `quality-gates.mjs` e `vitest-flaky-retry.mjs` apenas para julgar se `coverage-baseline.json`
   e `quality-gates.config.json` — que são do meu escopo — têm efeito real. Não auditei os
   ~80 scripts `db:check:*` nem os `simulate:*`.

7. **`supabase/functions/` e `supabase/migrations/` estão fora do meu escopo.** Os números de
   §8 (6/75 edge functions com teste, 0/361 migrations) foram levantados apenas para responder à
   pergunta de cobertura por dimensão. A auditoria de mérito daquele código é de outra dimensão.

8. **Não avaliei corretude semântica das asserções.** Verifiquei que existem, que não são
   tautológicas e contra o quê apontam. Não julguei se `expect(cosineSimilarity(v,v)).toBeCloseTo(1)`
   é a asserção _certa_ para o requisito — apenas que ela testa código real e importado.
