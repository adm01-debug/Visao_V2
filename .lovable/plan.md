

## Relatório de bundle com análise de tree-shaking

Gerar um relatório acionável que identifica os maiores ofensores no bundle JS, oportunidades de tree-shaking perdidas e candidatos a code-splitting/lazy loading.

### Estado atual

- `vite.config.ts` já tem `manualChunks` configurado (vendor-react, vendor-ui, vendor-charts, vendor-motion, vendor-query, vendor-supabase, vendor-pdf).
- `scripts/check-bundle-size.mjs` reporta top 5 chunks raw/gzipped e enforça orçamento (600KB/chunk, 2MB total raw).
- `scripts/analyze-bundle.sh` faz listagem básica via `du`.
- Faltam: visualização gráfica (treemap), análise de imports duplicados, detecção de barrel imports não tree-shaken, breakdown por dependência dentro de cada chunk.

### Solução em 3 entregas

**Entrega 1 — Visualização interativa (rollup-plugin-visualizer)**

- Instalar `rollup-plugin-visualizer` (devDep).
- Patch em `vite.config.ts`: ativar plugin condicionalmente via env (`ANALYZE=true npm run build`), gerando `dist/stats.html` (treemap interativo, sunburst e network) com `gzipSize: true` e `brotliSize: true`.
- Não impacta builds normais (plugin só entra quando `ANALYZE=true`).
- Adicionar script: `"build:analyze": "ANALYZE=true vite build"`.

**Entrega 2 — Relatório consolidado (`scripts/bundle-report.mjs`)**

Script Node que roda após o build e gera `/mnt/documents/bundle-report.md` com:

1. **Sumário executivo**: total raw/gzipped, número de chunks, comparação com o orçamento atual (`check-bundle-size.mjs`).
2. **Top 15 chunks** (raw + gzipped) com % do total.
3. **Top 20 dependências por peso** (parsing dos `stats.html` JSON gerado pelo visualizer ou via `source-map-explorer` como fallback).
4. **Detecção de duplicados**: pacotes que aparecem em múltiplos chunks (ex.: `lodash`, `date-fns`) — sintoma de import path inconsistente.
5. **Barrel imports suspeitos**: grep em `src/**/*.{ts,tsx}` por padrões `import { X } from '@/components/ui'` (ao invés de path direto), `import * as X from`, e imports completos de libs com tree-shaking ruim (`import _ from 'lodash'`, `import * as Icons from 'lucide-react'`).
6. **Candidatos a lazy loading**: chunks > 100KB raw que NÃO estão em `lazyRoutes.ts`.
7. **Heavy deps já presentes**: cross-check com `package.json` para listar peso de `@tensorflow/*`, `@mediapipe/*`, `face-api.js`, `recharts`, `framer-motion`, `jspdf`, `html2canvas`.
8. **Recomendações priorizadas**: lista ordenada por impacto estimado (KB economizados).

**Entrega 3 — Documentação + script npm**

- Criar `docs/BUNDLE_ANALYSIS.md` explicando como rodar (`npm run bundle:report`), interpretar `stats.html`, e processo de iteração.
- Script npm: `"bundle:report": "npm run build:analyze && node scripts/bundle-report.mjs"`.
- Não altera CI nem orçamentos atuais (escopo: relatório, não enforcement).

### Critérios de aceitação

- ✅ `npm run build:analyze` gera `dist/stats.html` (treemap interativo).
- ✅ `npm run bundle:report` gera `/mnt/documents/bundle-report.md` com 8 seções acima.
- ✅ Relatório lista pelo menos 3 recomendações concretas com KB estimados.
- ✅ Build normal (`npm run build`) continua funcionando sem o plugin.
- ✅ `docs/BUNDLE_ANALYSIS.md` criado.
- ✅ Artifact `bundle-report.md` exposto via `<lov-artifact>` para download.

### Arquivos a criar/editar

| Arquivo | Mudança |
|---|---|
| `package.json` | ➕ devDep `rollup-plugin-visualizer` + scripts `build:analyze`, `bundle:report` |
| `vite.config.ts` | ✏️ Plugin condicional via `process.env.ANALYZE` |
| `scripts/bundle-report.mjs` | ➕ Criar (gera markdown consolidado) |
| `docs/BUNDLE_ANALYSIS.md` | ➕ Criar (guia de uso) |

### Riscos e mitigações

- **Risco:** plugin visualizer infla tempo de build.
  - **Mitigação:** ativado só com `ANALYZE=true`, não roda em CI/dev.
- **Risco:** parsing do `stats.html` é frágil (formato pode mudar entre versões).
  - **Mitigação:** usar `template: 'raw-data'` do plugin, que emite JSON estável (`stats.json`); fallback para `source-map-explorer` se necessário.
- **Risco:** detecção de barrel imports gera ruído (alguns barrels SÃO tree-shaken corretamente quando lib tem `sideEffects: false`).
  - **Mitigação:** relatório marca como "suspeito", não como erro; explica no doc como verificar.
- **Risco:** primeira execução lista muitas oportunidades, dificultando priorização.
  - **Mitigação:** ordenar por KB economizados; limitar top 10 recomendações.

