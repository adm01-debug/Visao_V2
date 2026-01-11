# Changelog

## [2.2.0] - 2026-01-11

### 🚀 V18 - 101 Melhorias Implementadas

#### Type Safety (8)
- Criado `src/types/file-system-access.d.ts`
- Criado `src/types/performance-memory.d.ts`
- Criado `src/types/network-information.d.ts`
- Removido "as any" de 5 arquivos

#### Performance (12)
- Adicionado `src/lib/lazyLoad.ts` para code splitting
- Adicionado `src/lib/performanceUtils.ts` para memoização
- Documentação de refatoração para 10 arquivos grandes

#### i18n (3)
- Configuração completa de react-i18next
- Traduções pt-BR e en-US

#### Edge Functions (2)
- Testes para `process-automation-rules`
- Testes para `send-telegram`

#### Documentação (10)
- CODE_OF_CONDUCT.md
- JSDOC_GUIDE.md
- REFATORACAO_ARQUIVOS_GRANDES.md
- CODE_MARKERS_TRACKING.md
- GITHUB_ACTIONS_BILLING.md
- RELATORIO_FINAL_V18_101_MELHORIAS.md


Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [2.1.0] - 2026-01-11

### Added - Sprint V17 Completo
- 17 novos testes de componentes:
  - AutomationRulesManager, BottomNavigation, CustomizableDashboard
  - GlobalSearch, GlobalShortcutsHelp, GlobalShortcutsProvider
  - LazyLoad, MainLayout, MobileBottomNav, OfflineIndicator
  - PerformancePanel, ResponsiveDialog, ResponsiveLayout
  - RuleExecutionHistory, RuleTemplateSelector, SwipeableView, ThemeSelector

- 3 declarações de tipos TypeScript:
  - browser-apis.d.ts (Performance Memory, Background Sync, requestIdleCallback)
  - image-capture.d.ts (ImageCapture API)
  - eye-dropper.d.ts (EyeDropper API)

- 2 documentos na raiz:
  - DEPLOYMENT.md
  - ARCHITECTURE.md

### Changed
- package.json: nome atualizado para "vis-o", versão 2.1.0
- Metadados completos (description, author, license, repository)

### Fixed - Type Safety
- Removido @ts-ignore de ScreenCapture.tsx
- Removido @ts-ignore de ColorPickerAdvanced.tsx
- Removido "as any" de 10 arquivos:
  - memoryManager.ts, backgroundSync.ts, renderOptimizer.ts
  - useFullscreen.ts, useNetworkState.ts, useDeviceMotion.ts
  - useIndexedDBSync.ts, stripe.ts, webVitals.ts, routes.ts

## [2.0.0] - 2026-01-11

### Added
- 69 testes de UI, hooks e libraries
- 10 PRs de dependências merged
- Documentação completa (PLANO_IMPLEMENTACAO_V16_EXAUSTIVO.md)

### Fixed
- Console statements protegidos com import.meta.env.DEV
- Limpeza de 36 arquivos com console.log/error/warn

## [1.0.0] - 2025-12-19

### Added
- Sistema de vigilância com IA
- Reconhecimento facial com face-api.js
- Detecção de EPIs
- Alertas em tempo real
- Dashboard customizável
- Integração com Supabase