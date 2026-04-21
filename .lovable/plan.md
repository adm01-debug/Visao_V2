

## Dashboard de cobertura de código por arquivo

Gerar relatório de coverage do Vitest e expor um dashboard interno na aplicação que liste o percentual por arquivo, com filtros e destaque para trechos pouco testados — facilitando priorização de novos testes.

### Estado atual

- `vitest.config.ts` já tem `coverage` configurado com reporters `text`, `html`, `json-summary` e include em `src/utils/**`, `src/services/**`, `src/hooks/**`, `src/contexts/**`.
- `.github/workflows/coverage.yml` roda `vitest run --coverage` em push para `main` mas só imprime "✅ Coverage Report completed" — não publica artefato nem dashboard.
- Não existe visualização in-app de cobertura.
- 118 testes passando atualmente (validado no relatório PDF anterior).

### Solução em 3 camadas

**1. Geração de coverage detalhado (build-time)**

Atualizar `vitest.config.ts`:
- Adicionar reporter `json` (gera `coverage/coverage-final.json` com cobertura por linha/branch por arquivo).
- Manter `json-summary` (gera `coverage/coverage-summary.json` — totais por arquivo + global).
- Expandir `include` para `src/**/*.{ts,tsx}` (hoje só cobre 4 pastas — perderíamos componentes/páginas).
- Adicionar `exclude`: `**/*.test.*`, `**/*.spec.*`, `src/test/**`, `src/integrations/supabase/types.ts`, `src/main.tsx`, `**/*.d.ts`.

**2. Pipeline que copia coverage para `public/`**

Novo script `scripts/build-coverage-report.mjs`:
- Roda após `vitest run --coverage` (script npm `coverage` já existe ou é criado: `"coverage": "vitest run --coverage && node scripts/build-coverage-report.mjs"`).
- Lê `coverage/coverage-summary.json`.
- Transforma em formato enxuto `{ generatedAt, totals: {...}, files: [{ path, statements, branches, functions, lines }] }`.
- Escreve em `public/coverage-report.json` (servido estático em `/coverage-report.json`).
- Gera também `public/coverage-report.txt` (versão human-readable para download).

**3. Dashboard in-app `/coverage`**

Novo componente `src/pages/CoveragePage.tsx` (variant `wide` do `<Page>`):
- Fetch `/coverage-report.json` no mount via `useQuery`.
- Header: 4 stat cards (Statements, Branches, Functions, Lines) com % global + barra de progresso colorida (verde ≥80%, amarelo 50-79%, vermelho <50%).
- Banner com `generatedAt` ("Última execução: …") e botão "Baixar relatório completo" (link para `/coverage-report.txt`).
- Tabela ordenável por arquivo:
  - Colunas: Arquivo (truncado, com tooltip), Statements %, Branches %, Functions %, Lines %, Status (badge).
  - Ordenação default: menor cobertura primeiro (ajuda priorização).
  - Filtros: input de busca por path, toggle "Mostrar apenas <80%", select de pasta (`hooks/`, `services/`, `pages/`, `components/`, `utils/`, `contexts/`).
  - Linha colorida sutilmente conforme cobertura (vermelho/amarelo/verde via tokens semânticos HSL).
- Empty state: se `/coverage-report.json` 404, mostra instrução "Rode `npm run coverage` para gerar o relatório".
- Lazy-loaded via `React.lazy` (segue padrão do projeto).

Sub-componentes:
- `src/components/coverage/CoverageStatsCards.tsx`
- `src/components/coverage/CoverageTable.tsx`
- `src/components/coverage/CoverageRow.tsx`
- `src/components/coverage/CoverageFilters.tsx`
- `src/types/coverage.ts` (tipos do JSON consumido)

**4. Rota e navegação**

- Adicionar rota `/coverage` em `App.tsx` dentro de `ProtectedLayoutRoute`, lazy-loaded.
- Restringir via RBAC a `admin` (cobertura é dado interno de engenharia).
- Adicionar item "Cobertura" no Sidebar sob seção Admin/Telemetria, com ícone `ShieldCheck` ou `TestTube`.

**5. CI: publicar coverage como artefato**

Atualizar `.github/workflows/coverage.yml`:
- Após rodar `vitest run --coverage`, executa `node scripts/build-coverage-report.mjs`.
- `actions/upload-artifact@v4` para `coverage/` (HTML report) e `public/coverage-report.json`.
- Job adiciona summary no `$GITHUB_STEP_SUMMARY` com tabela markdown dos 10 arquivos com menor cobertura + totais globais.
- Comenta no PR (via `actions/github-script`) com tabela resumo quando run for em PR.

**6. Documentação**

`docs/COVERAGE_DASHBOARD.md` (~60 linhas):
- Como rodar local (`npm run coverage`).
- Como acessar dashboard (`/coverage` autenticado como admin).
- Como interpretar cores/thresholds.
- Política: arquivos críticos (services, hooks de auth) devem ter ≥80%.

### Critérios de aceitação

- `npm run coverage` gera `public/coverage-report.json` com objeto `{ totals, files[] }`.
- Acessar `/coverage` autenticado como admin renderiza dashboard com 4 stat cards + tabela de todos os arquivos do projeto sob `src/`.
- Tabela ordenável e filtrável; ordenação padrão = menor cobertura primeiro.
- Cores semânticas (verde/amarelo/vermelho) via tokens HSL — sem hex hardcoded.
- Lazy-loaded; <300 linhas por componente; TS strict; lint zero-warnings.
- CI publica artefato de coverage e summary com top 10 arquivos menos cobertos.
- Página retorna empty state amigável se relatório ainda não foi gerado.
- Não-admin é redirecionado para `/acesso-negado` ao acessar `/coverage`.

### Arquivos a criar/editar

**Criar:**
- ➕ `src/pages/CoveragePage.tsx`
- ➕ `src/components/coverage/CoverageStatsCards.tsx`
- ➕ `src/components/coverage/CoverageTable.tsx`
- ➕ `src/components/coverage/CoverageRow.tsx`
- ➕ `src/components/coverage/CoverageFilters.tsx`
- ➕ `src/types/coverage.ts`
- ➕ `scripts/build-coverage-report.mjs`
- ➕ `docs/COVERAGE_DASHBOARD.md`

**Editar:**
- ✏️ `vitest.config.ts` (reporters + include/exclude)
- ✏️ `package.json` (script `coverage`)
- ✏️ `src/App.tsx` (rota `/coverage` lazy + protegida por admin)
- ✏️ Sidebar (item "Cobertura" sob Admin)
- ✏️ `.github/workflows/coverage.yml` (artefato + summary + comentário em PR)
- ✏️ `.gitignore` (garantir que `public/coverage-report.json` é ignorado em dev — gerado local — ou versionado se preferir snapshot; padrão: ignorado)

### Riscos

- **Risco:** `coverage-report.json` em `public/` pode crescer (>500 KB) se houver muitos arquivos.
  - **Mitigação:** script gera versão enxuta apenas com totais por arquivo (sem mapa linha-a-linha), tipicamente <50 KB para 500+ arquivos.
- **Risco:** expor cobertura publicamente revela estrutura interna.
  - **Mitigação:** rota é protegida por RBAC admin; arquivo JSON está em `public/` mas só é fetchado a partir da página autenticada — para reforçar, mover para edge function `get-coverage-report` que valida sessão+role e serve o JSON.
- **Risco:** rodar coverage em todo `src/**` torna a suíte mais lenta.
  - **Mitigação:** coverage roda só no script dedicado (`npm run coverage`), não no `npm run test` regular do dev loop.
- **Risco:** baseline de cobertura assustadoramente baixa em primeira execução pode gerar ruído.
  - **Mitigação:** documentar que a primeira foto serve apenas para priorizar; não há gate de CI que falhe build por % baixo (ainda).

