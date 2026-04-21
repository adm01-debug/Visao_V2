

## Limpeza de imports e referências não usadas

Remover imports órfãos, variáveis não utilizadas e referências mortas em arquivos TypeScript/TSX, reduzindo bundle e ruído de manutenção. Resolver primeiro o erro de build recorrente (cache stale do `CoveragePage`).

### Estado atual

- Build falhando com `ENOENT` em `src/components/coverage/CoverageStatsCards` — arquivos existem no disco; erro é cache Vite stale (já ocorreu 3x nesta sessão).
- `tsconfig.json` tem `noUnusedLocals: false` e `noUnusedParameters: false` → TS não acusa imports/vars órfãos hoje.
- ESLint tem regra `@typescript-eslint/no-unused-vars` mas com baseline alto de warnings pré-existentes.
- Knip (instalado na rodada anterior) detecta exports não usados e arquivos órfãos, mas não imports não usados dentro de arquivos vivos.

### Solução em 3 fases

**Fase 0 — Destravar build (pré-requisito)**

- `touch` em `src/components/coverage/*.tsx` + `src/pages/CoveragePage.tsx` para invalidar cache Vite.
- Validar com `npm run build` antes de qualquer outra ação.

**Fase 1 — Auto-fix com ESLint**

- Rodar `npx eslint "src/**/*.{ts,tsx}" --fix --rule '{"@typescript-eslint/no-unused-vars":"error","unused-imports/no-unused-imports":"error"}'`.
- Instalar `eslint-plugin-unused-imports` (devDep) — única forma confiável de **remover** (não só avisar) imports órfãos automaticamente.
- Adicionar plugin ao `eslint.config.js` com regras:
  - `unused-imports/no-unused-imports`: `error` (remove imports)
  - `unused-imports/no-unused-vars`: `warn` (com `argsIgnorePattern: "^_"`)
- Rodar fix → captura quantos imports/vars foram removidos por arquivo.

**Fase 2 — Limpeza assistida (variáveis e parâmetros)**

- Para warnings remanescentes de `no-unused-vars` que o auto-fix não resolve (vars locais com side-effects, destructuring), gerar lista agrupada por arquivo em `/mnt/documents/unused-vars-report.md`.
- Aplicar correções manuais em lotes de 10-15 arquivos por vez:
  - Remover declarações claramente mortas.
  - Renomear parâmetros não usados para `_param` (convenção argsIgnorePattern).
  - Anotar com `// eslint-disable-next-line` apenas casos legítimos (ex.: tipos de assinatura de callback).

**Fase 3 — Endurecer tsconfig + CI gate**

- Atualizar `tsconfig.json`: `noUnusedLocals: true`, `noUnusedParameters: true` (com `_` prefix exception via convenção).
- Validar `npx tsc --noEmit` zero erros.
- Garantir que workflow `dependency-audit.yml` rode ESLint com as novas regras (warning-only inicialmente).

### Critérios de aceitação

- `npm run build` passa ✅
- `npx tsc --noEmit` passa com `noUnusedLocals/Parameters: true` ✅
- `npx eslint "src/**/*.{ts,tsx}"` reporta 0 erros de `no-unused-imports` ✅
- `npx vitest run` mantém 118/118 testes passando ✅
- Relatório `/mnt/documents/unused-vars-report.md` documenta quantos imports/vars foram removidos por pasta.
- Bundle size do `npm run build` comparado antes/depois (esperado: redução de 1-3% via tree-shaking melhor).

### Arquivos a criar/editar

**Criar:**
- ➕ `/mnt/documents/unused-vars-report.md` (relatório consolidado)

**Editar:**
- ✏️ `package.json` (devDep `eslint-plugin-unused-imports`)
- ✏️ `eslint.config.js` (registrar plugin + regras)
- ✏️ `tsconfig.json` (ativar `noUnusedLocals` + `noUnusedParameters`)
- ✏️ Múltiplos `src/**/*.{ts,tsx}` (limpeza automática + manual em lotes)

### Riscos e mitigações

- **Risco:** ESLint --fix remove import com side-effect (ex.: `import "./polyfills"`).
  - **Mitigação:** plugin `unused-imports` respeita imports sem binding por padrão; revisar diff antes de commitar.
- **Risco:** ativar `noUnusedParameters` quebra assinaturas de callbacks de libs (React event handlers, etc.).
  - **Mitigação:** convenção `_param` + `argsIgnorePattern: "^_"`.
- **Risco:** lote grande de mudanças dificulta revisão.
  - **Mitigação:** Fase 1 (auto-fix) em commit único; Fase 2 (manual) em lotes documentados no relatório.
- **Risco:** falsos positivos em arquivos com tipagem complexa (generics, type-only imports).
  - **Mitigação:** rodar `tsc --noEmit` após cada lote; reverter individualmente se quebrar.
- **Risco:** cache Vite stale volta a quebrar build durante a operação.
  - **Mitigação:** Fase 0 sempre executada primeiro; se reincidir, `rm -rf node_modules/.vite` antes do build.

