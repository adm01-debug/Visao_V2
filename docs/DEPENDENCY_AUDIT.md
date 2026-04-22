# Dependency Audit — VISÃO

Auditoria contínua de **dead code**, **dependências não utilizadas** e **exports órfãos** com [`knip`](https://knip.dev). Detecta regressões via baseline commitado e roda semanalmente em CI.

---

## TL;DR

```bash
# Auditoria completa (gera summary.json + summary.md + raw.json)
npm run audit:deadcode

# Relatório legível com classificação de risco
npm run audit:report

# Comparar contra baseline (warning-only)
npm run audit:deadcode:check

# Comparar e falhar se houver regressão
npm run audit:deadcode:check:strict

# Atualizar baseline após uma limpeza aprovada
npm run audit:deadcode:baseline
```

Saídas em `reports/deadcode/`:

| Arquivo | Conteúdo |
|---|---|
| `raw.json` | Saída crua do knip (input para outros scripts) |
| `summary.json` | Contagens por categoria + metadados |
| `summary.md` | Resumo Markdown legível |
| `dependency-audit-report.md` | Relatório com classificação de risco (🔴/🟡/🟢) |
| `baseline.json` | Snapshot commitado para detecção de regressões |

---

## Comandos disponíveis

### `npm run audit:deadcode`

Roda `knip --reporter json --no-exit-code` e gera os 3 artefatos base (`raw.json`, `summary.json`, `summary.md`).

Flags suportadas pelo wrapper (`scripts/audit-deadcode.mjs`):

| Flag | Efeito |
|---|---|
| `--format=json` | Imprime summary JSON no stdout (em vez de tabela) |
| `--strict` | Sai com código 1 se houver QUALQUER achado |
| `--quiet` | Suprime logs informativos |

### `npm run audit:report`

Lê `raw.json` e gera `reports/deadcode/dependency-audit-report.md` com:

- Resumo executivo por categoria
- Buckets de risco (🔴 alto · 🟡 médio · 🟢 baixo) com guia de ação
- Listas detalhadas de arquivos órfãos, exports, tipos, deps mortas
- Imports não declarados / não resolvidos (sempre risco alto)
- Próximos passos sugeridos

Use `--refresh` para reexecutar `audit:deadcode` antes:

```bash
node scripts/build-dependency-audit-report.mjs --refresh
```

### `npm run audit:deadcode:check`

Compara `summary.json` (atual) contra `baseline.json` (commitado). Imprime tabela com `Δ` por categoria. **Nunca falha** (warning-only) — útil em PRs como informação.

### `npm run audit:deadcode:check:strict`

Mesma comparação, mas sai com código 1 se qualquer categoria piorar. Usado no workflow semanal opcionalmente.

### `npm run audit:deadcode:baseline`

Sobrescreve `reports/deadcode/baseline.json` com os valores atuais. **Faça commit** após cada limpeza aprovada para que regressões futuras sejam detectadas.

---

## Como interpretar o risco de remoção

O relatório (`dependency-audit-report.md`) classifica cada achado em 3 níveis. As heurísticas são **conservadoras** — em dúvida, sobe o risco.

### 🟢 Baixo — remoção segura na maioria dos casos

| Categoria | Exemplos |
|---|---|
| **Arquivos** | `src/utils/*`, `src/helpers/*`, `src/constants/*` puros, mocks/`__tests__` órfãos |
| **Exports** | Re-exports redundantes, types/constants isolados |
| **Deps** | Utilitários puros sem peer-deps (ex.: `file-saver`, `sanitize-html`, `xss`) |

**Procedimento:** validar com `grep -rE "from ['\"]<pkg>['\"]" src supabase/functions tests`. Se 0 resultados → remover em PR único.

### 🟡 Médio — verificar antes de remover

| Categoria | Por quê |
|---|---|
| **Arquivos em `pages/`, `components/`, `routes/`** | Podem ser referenciados por strings dinâmicas, lazy imports (`React.lazy(() => import("..."))`) ou registros de plugins |
| **Exports nomeados em `src/`** que não sejam types/constants | Podem ser consumidos por barrels (`index.ts`) que o knip não rastreia bem |
| **Deps com peer-deps** | Ex.: `@hookform/*`, `react-*`, `embla-*`, `cmdk`, `vaul` — podem ser dependências indiretas usadas via outros pacotes |

**Procedimento:**
1. `grep -rE "\b<nome>\b" src` — verificar referências literais
2. Buscar string do path do arquivo em rotas dinâmicas (`App.tsx`, configs de roteador)
3. Verificar barrels: `cat src/<dir>/index.ts | grep <nome>`
4. Se confirmado órfão → remover; senão → manter com comentário explicativo

### 🔴 Alto — auditoria manual obrigatória

| Categoria | Por quê |
|---|---|
| **Entrypoints** (`src/main.*`, `src/App.*`) | Bootstrap da aplicação |
| **`layouts/`, `providers/`, `contexts/`, `integrations/`, `config/`** | Provedores globais carregados via composição em alto nível |
| **`hooks/use*`** | Potencial uso por lazy imports ou composição em hooks customizados |
| **`supabase/functions/**`** | Edge Functions chamadas por URL — knip não rastreia |
| **Exports `default` em `pages/components`** | Quase sempre alvos de `React.lazy` |
| **Barrels (`index.ts`/`index.tsx`)** | Re-exportam para o resto do app; remover quebra cadeias inteiras |
| **Deps do ecossistema runtime crítico** | `@radix-ui/*`, `react*`, `@sentry/*`, `@supabase/*`, `@tanstack/*`, `framer-motion`, `recharts`, `zod`, `zustand`, `date-fns`, `hls.js`, `face-api`, `mapbox-gl` |

**Procedimento:** abrir issue separada por item; **não remover em batch**. Inspecionar:
- Lazy imports: `grep -rE "lazy\(.*=>.*import\(" src`
- Strings dinâmicas: `grep -rE "['\"]<basename>['\"]" src`
- Consumo externo: Storybook, Edge Functions, scripts de build, CI

---

## Falsos positivos comuns

O knip não detecta:

1. **Lazy imports com path computado**
   ```ts
   const Page = React.lazy(() => import(`./pages/${name}`));
   ```
2. **Re-exports via barrels múltiplos níveis** quando paths são quebrados
3. **Componentes registrados como string** (rotas dinâmicas, plugins)
4. **Dependências consumidas apenas por Edge Functions** (Deno) — knip varre só o frontend
5. **Tipos usados apenas em assinaturas de generics** complexos
6. **Pacotes com side effects no import** (ex.: polyfills, registros globais)

Ao auditar, sempre rode os `grep` sugeridos antes de remover.

---

## Workflow CI (`.github/workflows/knip.yml`)

| Trigger | Modo | Ação |
|---|---|---|
| `push` em PR/branch | warning-only | Posta resumo no Job Summary |
| `schedule` (segundas 06:00 UTC) | warning-only | Roda audit + comparação contra baseline |
| `workflow_dispatch` com `update_baseline=true` | — | Atualiza `baseline.json` via CI |

A saída de `audit:deadcode:check` é anexada ao `GITHUB_STEP_SUMMARY` automaticamente.

---

## Fluxo de limpeza recomendado

```
1. npm run audit:report                    # gera relatório classificado
2. Revisar reports/deadcode/dependency-audit-report.md
3. Abrir 1 PR por categoria de risco:
   - PR #1: deps 🟢 baixo
   - PR #2: exports 🟢 baixo
   - PR #3: arquivos 🟡 médio (após validação grep)
4. Em cada PR: npm run build && npm run typecheck && npm test
5. Após merge: npm run audit:deadcode:baseline && commit
6. Itens 🔴 alto → issues separadas com investigação manual
```

---

## Referências

- Configuração: `knip.json`
- Wrapper: `scripts/audit-deadcode.mjs`
- Relatório com risco: `scripts/build-dependency-audit-report.mjs`
- Comparação baseline: `scripts/check-deadcode-baseline.mjs`
- Workflow: `.github/workflows/knip.yml`
- Documentação oficial: <https://knip.dev>
