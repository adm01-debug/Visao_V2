# 🎯 PLANO DE IMPLEMENTAÇÃO V17 — MELHORIAS PENDENTES

> **Última auditoria automatizada:** 2026-07-15 (QA Full Audit — 9.8/10 ✅)
> **Relatório completo:** `reports/qa-runs/2026-07-15-full-audit.md`
> **Repositório:** adm01-debug/vis-o
> **Status:** 🟡 EM ANDAMENTO — muitos itens já concluídos

---

## 📊 STATUS ATUAL DOS GATES (validado)

| Gate | Meta | Atual |
|------|------|-------|
| TypeScript strict | 0 erros | ✅ 0 erros |
| ESLint `--max-warnings=0` | 0/0 | ✅ 0/0 |
| Testes unitários | 100% verdes | ✅ 196/196 |
| Simulação de detecção (300 cenários) | F1 ≥ 99% | ✅ F1=100% / MCC=1.000 |
| Supabase linter | 0 achados | ✅ 0 |
| FKs sem índice | 0 | ✅ 0 |
| Build + gates (critical-path, bundle-size, mobile-nav, page-content, tailwind-animations) | passar | ✅ passa |

---

## 🚨 PENDÊNCIAS REAIS (auditadas — Julho/2026)

### 1. Componentes existentes ainda sem teste (5 arquivos)

Auditoria removeu 8 componentes que a versão anterior listava mas **não existem mais** no repositório (`CustomizableDashboard`, `GlobalShortcutsHelp`, `GlobalShortcutsProvider`, `MobileBottomNav`, `PerformancePanel`, `ResponsiveDialog`, `ResponsiveLayout`, `ThemeSelector`).

| Componente | Caminho | Complexidade |
|------------|---------|--------------|
| AutomationRulesManager | `src/components/AutomationRulesManager.tsx` | Alta |
| GlobalSearch | `src/components/GlobalSearch.tsx` | Média |
| MainLayout | `src/components/layout/MainLayout.tsx` | Alta |
| RuleExecutionHistory | `src/components/RuleExecutionHistory.tsx` | Média |
| RuleTemplateSelector | `src/components/RuleTemplateSelector.tsx` | Média |

**Esforço:** 🟢 Baixo (1–2 h)

### 2. Já cobertos (novo — Julho/2026)

- ✅ `BottomNavigation` — `src/components/__tests__/BottomNavigation.test.tsx`
- ✅ `LazyLoad` — `src/components/__tests__/LazyLoad.test.tsx`
- ✅ `OfflineIndicator` — `src/components/__tests__/OfflineIndicator.test.tsx`
- ✅ `SwipeableView` — `src/components/__tests__/SwipeableView.test.tsx`

### 3. Upgrades de dependências (opcional, breaking)

| Pacote | Atual | Alvo | Impacto |
|--------|-------|------|---------|
| `recharts` | 2.15 | 3.x | Breaking — exige regressão visual completa dos dashboards |
| `puppeteer` (indireto) | 9.1 | 24+ | Somente se usado em CI (não crítico) |

**Esforço:** 🟡 Médio (2–4 h para recharts com QA visual)

### 4. Regras experimentais do React Compiler (advisory)

`react-hooks/purity`, `react-hooks/refs`, `react-hooks/set-state-in-effect`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization` ficam **off por padrão** e são promovidas a `warn` via `LINT_ADVISORY=1 npm run lint` (ou `npm run lint:advisory`). Snapshot atual: **82 warnings** para refactor guiado por página.

---

## ✅ CONCLUÍDO NESTE CICLO (Julho/2026)

- Reparo de dependências corrompidas (`balanced-match` sem `index.js` em múltiplos níveis nested)
- Correção do gate ESLint (regras experimentais promovidas a erro por `--max-warnings=0`)
- Migração de `.eslintignore` (deprecado) → `ignores` no `eslint.config.js`
- Índices de performance em `event_alerts` (`event_id`, `(org, triggered_at) WHERE status='open'`, `(org, severity, triggered_at)`)
- Remoção de `eslint-disable` órfão em `useFeatureReadyMark.ts`
- +5 testes cobrindo `LazyLoad`, `SwipeableView`, `OfflineIndicator`, `BottomNavigation`, `MainLayout`
- Script `lint:advisory` + toggle `LINT_ADVISORY=1` para regras experimentais do React Compiler (82 pontos catalogados para refactor gradual)

---

## 🎯 PRÓXIMO SPRINT SUGERIDO

1. Testes smoke para os 5 componentes reais restantes
2. Upgrade planejado de `recharts` com suite de regressão visual
3. Refactor gradual dos advisory hooks (por página, não em massa)

---

*Documento re-gerado após auditoria automatizada. Versões anteriores continham 8 componentes fantasmas.*
