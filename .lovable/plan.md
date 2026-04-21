

## Auditoria de dependências e remoção de dead code

Identificar pacotes npm não utilizados, exports/arquivos órfãos e código morto, gerando relatório acionável + remoção segura em fases.

### Estado atual relevante

- `.github/workflows/dependency-audit.yml` só roda `npm audit` (vulnerabilidades), não detecta pacotes não utilizados.
- Inventários antigos em `docs/` apontam taxa de uso baixa de utilitários Claude (~7%) e múltiplos componentes/hooks órfãos.
- Sem ferramenta configurada para detectar dead code (knip, depcheck, ts-prune).

### Solução em 4 fases

**Fase 1 — Instalar ferramentas de auditoria**

- `knip` (devDep): detecta arquivos, exports, deps e devDeps não utilizados em projetos TS/Vite. Substitui depcheck + ts-prune com melhor precisão.
- Configurar `knip.json` na raiz:
  - `entry`: `src/main.tsx`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `supabase/functions/**/index.ts`, `scripts/**/*.{mjs,sh}`, `playwright.config.ts`.
  - `project`: `src/**/*.{ts,tsx}`.
  - `ignore`: `src/integrations/supabase/types.ts`, `src/components/ui/**` (shadcn — pode ter componentes "para uso futuro" intencionalmente), stories `*.stories.tsx`, testes `**/*.test.*`.
  - `ignoreDependencies`: pacotes usados só em config (ex.: `@types/*`, `tailwindcss-animate`, plugins Vite/PostCSS).

**Fase 2 — Gerar relatório de auditoria**

- Novo script `scripts/audit-dependencies.mjs`:
  - Roda `knip --reporter json` e captura saída.
  - Categoriza achados em 4 buckets: `unused-files`, `unused-exports`, `unused-dependencies`, `unused-devDependencies`.
  - Gera `/mnt/documents/dependency-audit-report.md` com:
    - Sumário executivo (contagem por categoria).
    - Lista por categoria com path/pacote.
    - Estimativa de economia em KB (via `du -sh node_modules/<pkg>` para deps).
    - Coluna "Risco de remoção" (baixo/médio/alto) baseada em heurística (ex.: hooks usados via dynamic import = alto).
  - Adiciona script npm: `"audit:deadcode": "node scripts/audit-dependencies.mjs"`.

**Fase 3 — Remoção em fases (com revisão humana)**

Após relatório, propor 3 PRs lógicos para revisão antes de aplicar:

1. **Pacotes obviamente não utilizados** (após confirmar zero referências):
   - Candidatos prováveis baseados no inventário antigo: scripts `install-all-deps.sh` lista `cypress`, `msw`, `@storybook/*`, `vite-plugin-pwa`, `workbox-window`, `chromatic` — verificar quais nunca foram efetivamente integrados.
   - Comando: `npm uninstall <pkg1> <pkg2> ...`.

2. **Arquivos órfãos** (sem nenhum import em todo o projeto):
   - Componentes utilitários Claude listados como "❌ Não usados" no inventário (`EmptyState`, `ErrorState`, `LoadingSpinner`, `Breadcrumbs` antigos, `StatCard`, etc.) — confirmar com knip antes de deletar.
   - Hooks órfãos (`useDebounce`, `useToggle`, `useInterval`, `useTimeout`, `useDocumentTitle`, etc.) listados no inventário.
   - Libs órfãs (`formatters`, `validators`, `apiError`, `logger` duplicado, `rateLimiter`, etc.).

3. **Exports não utilizados** (arquivo é usado mas tem exports mortos):
   - Aplicar via PRs menores por pasta (services, utils, lib).

**Cada deleção é precedida por:**
- Busca dupla com `code--search_files` para confirmar zero referências (knip pode dar falso positivo em dynamic imports).
- Lista de arquivos a deletar é apresentada antes de executar.

**Fase 4 — CI gate contínuo**

- Atualizar `.github/workflows/dependency-audit.yml`:
  - Adicionar step `npx knip --reporter github` (formato adequado para PRs).
  - Comentar PR com diff de deps se houver introdução de pacote não utilizado.
  - **Não falha o build** inicialmente (warning-only) para evitar bloqueios; promover para erro após baseline limpa.

### Critérios de aceitação

- `npm run audit:deadcode` gera relatório markdown em `/mnt/documents/dependency-audit-report.md`.
- Relatório lista, separadamente: arquivos órfãos, exports órfãos, deps órfãs, devDeps órfãs.
- Cada item tem path/pacote + estimativa de impacto + risco.
- 3 PRs de remoção propostos no chat para aprovação antes de executar (não removo nada sem revisão).
- Após remoção: `npm run build`, `npx tsc --noEmit` e `npx vitest run` continuam passando.
- CI passa a rodar knip semanalmente (warning-only).
- Documentação `docs/DEPENDENCY_AUDIT.md` explica como rodar local e interpretar.

### Arquivos a criar/editar

**Criar:**
- ➕ `knip.json` (configuração)
- ➕ `scripts/audit-dependencies.mjs` (gera relatório consolidado)
- ➕ `docs/DEPENDENCY_AUDIT.md`

**Editar:**
- ✏️ `package.json` (devDep `knip` + script `audit:deadcode`)
- ✏️ `.github/workflows/dependency-audit.yml` (adicionar step knip)

**Deletar (em fases, após aprovação):**
- 🗑️ Pacotes npm órfãos (lista exata vinda do relatório)
- 🗑️ Arquivos `src/**` órfãos (lista exata vinda do relatório)

### Riscos e mitigações

- **Risco:** knip marca como morto algo carregado por dynamic import (`React.lazy`, `import()`).
  - **Mitigação:** revisar manualmente cada arquivo antes de deletar; usar `code--search_files` com regex `lazy\\(.*<nome>` e `import\\(.*<nome>`.
- **Risco:** componentes shadcn em `src/components/ui/` podem aparecer como não usados mas existem para uso futuro.
  - **Mitigação:** já no `ignore` do knip.config.
- **Risco:** remover dep em uso só em edge function Deno (não-Node).
  - **Mitigação:** entry inclui `supabase/functions/**/index.ts`; revisão manual de `import_map`/imports Deno.
- **Risco:** primeira execução pode listar centenas de itens, causando overwhelming.
  - **Mitigação:** relatório agrupa por categoria + ordena por impacto; remoção em 3 PRs separados.
- **Risco:** quebrar build ao remover algo aparentemente órfão (ex.: side-effect import).
  - **Mitigação:** após cada PR de remoção, rodar gates (build + tsc + vitest) antes de prosseguir.

