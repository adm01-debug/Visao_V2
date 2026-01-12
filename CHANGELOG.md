# Changelog

## [2.3.0] - 2026-01-12

### 🚀 V19 - Melhorias Completas de Infraestrutura

#### Arquivos Criados (100+)
- 15+ utilitários em src/lib/
- 10+ hooks em src/hooks/
- 25+ componentes
- 35+ testes
- 8 scripts de deploy
- 7 configurações k8s
- 15+ documentações

#### Destaques
- Sistema de toast notifications
- Componentes de navegação (Breadcrumb, Pagination)
- Componentes de dados (Table, List)
- Sistema de formulários (useForm)
- Utilitários de validação, cache, sanitização
- Configuração completa Kubernetes
- Scripts de deploy automatizado
- Documentação técnica completa

## [2.3.0] - 2026-01-11

### 🚀 V19 - Melhorias de Infraestrutura e Qualidade

#### Dependências
- Adicionado `i18next`, `react-i18next`, `i18next-browser-languagedetector`

#### React
- Habilitado React StrictMode para melhor detecção de problemas

#### Novos Utilitários (6)
- `src/lib/sanitization.ts` - Sanitização de inputs
- `src/lib/accessibility.ts` - Utilitários de acessibilidade WCAG 2.1
- `src/lib/cacheUtils.ts` - Cache com TTL em memória e localStorage
- `src/lib/errorReporting.ts` - Relatório de erros centralizado
- `src/lib/crashReporting.ts` - Detecção de crashes e freezes

#### Novos Hooks (2)
- `src/hooks/useVirtualList.ts` - Virtualização de listas longas
- `src/hooks/useIntersectionObserver.ts` - Observação de visibilidade

#### Infraestrutura
- `nginx.conf` - Configuração Nginx otimizada
- `k8s/deployment.yaml` - Deploy Kubernetes
- `k8s/service.yaml` - Service Kubernetes
- `k8s/ingress.yaml` - Ingress com TLS
- `k8s/configmap.yaml` - ConfigMap
- `k8s/hpa.yaml` - Auto-scaling horizontal

#### SEO
- Adicionado canonical URL no index.html
- Adicionado robots meta tags

#### Testes (7)
- Testes para todos os novos utilitários e hooks
- Teste para appStore.ts

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