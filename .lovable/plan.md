

## CI gate para dead code (módulos/exports não referenciados)

Adicionar verificação automatizada via Knip no CI que falha o build quando aparecerem arquivos, exports ou dependências não referenciados. Resolver primeiro o erro recorrente de cache stale do `CoveragePage` que está bloqueando o build.

### Estado atual

- `knip` já está instalado (rodadas anteriores), mas **não há configuração** (`knip.json`) nem integração no CI.
- `.github/workflows/dependency-audit.yml` só roda `npm audit` (vulnerabilidades), não detecta código morto.
- `.github/workflows/ci.yml` tem 4 gates (TS strict, lint, build, bundle budget) — sem dead-code gate.
- Build atual falhando com `ENOENT` em `src/components/coverage/CoverageTable` (cache Vite stale, padrão recorrente desta sessão).
- Sem baseline conhecido — primeira execução do Knip provavelmente lista dezenas/centenas de itens.

### Solução em 4 passos

**Passo 0 — Destravar build (pré-requisito)**

- `rm -rf node_modules/.vite dist`
- `touch src/components/coverage/*.tsx src/pages/CoveragePage.tsx`
- Validar `npm run build` antes de adicionar gate.

**Passo 1 — Configurar Knip com baseline**

Criar `knip.json` na raiz:

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": [
    "src/main.tsx",
    "src/App.tsx",
    "vite.config.ts",
    "tailwind.config.ts",
    "eslint.config.js",
    "scripts/**/*.{mjs,js,ts}",
    "supabase/functions/**/index.ts",
    "tests/**/*.{ts,tsx}",
    "src/**/*.test.{ts,tsx}",
    "src/**/*.stories.{ts,tsx}"
  ],
  "project": ["src/**/*.{ts,tsx}"],
  "ignore": [
    "src/integrations/supabase/types.ts",
    "src/types/**/*.d.ts",
    "src/components/ui/**"
  ],
  "ignoreDependencies": [
    "@types/*",
    "eslint-plugin-*",
    "@typescript-eslint/*"
  ],
  "ignoreBinaries": ["husky"]
}
```

Justificativa dos `ignore`:
- `types.ts` é gerado pelo Supabase.
- `*.d.ts` são ambient types (Knip pode não detectar uso).
- `components/ui/**` é shadcn/ui (mantemos para uso futuro, padrão da comunidade).

**Passo 2 — Scripts npm + relatório de baseline**

Adicionar em `package.json`:

```json
{
  "scripts": {
    "deadcode": "knip",
    "deadcode:production": "knip --production --strict",
    "deadcode:report": "knip --reporter markdown > dead-code-report.md || true",
    "deadcode:fix": "knip --fix --allow-remove-files"
  }
}
```

- `deadcode`: modo padrão (todos os tipos de issues).
- `deadcode:production`: usado no CI (foco em código de produção, ignora dev-only).
- `deadcode:report`: gera relatório sem falhar (para humanos).
- `deadcode:fix`: auto-remove (uso manual local).

**Passo 3 — Gerar baseline + integrar ao CI**

1. Rodar `npm run deadcode:report` localmente, salvar saída em `/mnt/documents/dead-code-baseline.md`.
2. Analisar: se houver muitos falsos positivos, refinar `knip.json` (ignore patterns adicionais).
3. Adicionar step em `.github/workflows/ci.yml` (após "Bundle Size Budget", antes dos E2E):

```yaml
- name: Dead Code Check (Knip)
  run: npm run deadcode:production
```

4. Adicionar mesmo step em `.github/workflows/dependency-audit.yml` (job paralelo).

**Estratégia de adoção:**
- Se baseline tiver > 20 itens: adicionar step com `continue-on-error: true` inicialmente + criar issue de cleanup. Promover para gate hard após cleanup.
- Se baseline tiver ≤ 20 itens: corrigir todos no mesmo PR e ativar gate hard direto.

**Passo 4 — Documentação**

Criar `docs/DEAD_CODE_POLICY.md` cobrindo:
- O que Knip detecta (arquivos órfãos, exports não usados, deps não usadas, deps não declaradas).
- Como rodar localmente (`npm run deadcode`).
- Como auto-corrigir (`npm run deadcode:fix`).
- Como adicionar exceções legítimas (editar `knip.json` com justificativa em comentário).
- Como interpretar saída do CI quando falhar.

### Critérios de aceitação

- ✅ `npm run build` passa (Passo 0).
- ✅ `npm run deadcode:production` executa sem erro de configuração.
- ✅ `knip.json` criado com entries cobrindo todos os entry points (app, scripts, edge functions, tests).
- ✅ Baseline gerado em `/mnt/documents/dead-code-baseline.md` com classificação por tipo.
- ✅ Step "Dead Code Check (Knip)" adicionado ao `ci.yml`.
- ✅ `docs/DEAD_CODE_POLICY.md` criado.
- ✅ Tentativa de adicionar `export const unused = 1` em arquivo novo → CI falha.

### Arquivos a criar/editar

| Arquivo | Mudança |
|---|---|
| `knip.json` | ➕ Criar (config principal) |
| `package.json` | ✏️ Adicionar 4 scripts `deadcode:*` |
| `.github/workflows/ci.yml` | ✏️ Adicionar step "Dead Code Check (Knip)" |
| `.github/workflows/dependency-audit.yml` | ✏️ Adicionar step "Dead Code Check (Knip)" |
| `docs/DEAD_CODE_POLICY.md` | ➕ Criar (guia de uso) |
| `/mnt/documents/dead-code-baseline.md` | ➕ Gerar (relatório inicial) |

### Riscos e mitigações

- **Risco:** baseline lista centenas de falsos positivos (componentes usados via lazy import, edge functions Deno).
  - **Mitigação:** `entry` inclui `lazyRoutes.ts`, `supabase/functions/**`, `*.stories.tsx`, `*.test.tsx`. Refinar `ignore` iterativamente.
- **Risco:** Knip não detecta uso dinâmico (`React.lazy(() => import('...'))` com strings).
  - **Mitigação:** `entry` em `knip.json` inclui explicitamente arquivos referenciados dinamicamente; usar `ignore` para casos restantes.
- **Risco:** Edge functions (Deno, não-Node) confundem Knip.
  - **Mitigação:** entry específico `supabase/functions/**/index.ts`; revisar primeiro relatório.
- **Risco:** ativar como hard gate quebra CI imediatamente.
  - **Mitigação:** Passo 3 prevê `continue-on-error: true` se baseline > 20 itens; promover para hard após cleanup.
- **Risco:** cache Vite stale volta a quebrar build durante a operação.
  - **Mitigação:** Passo 0 sempre executado primeiro.

