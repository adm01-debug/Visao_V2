# 📊 INVENTÁRIO EXAUSTIVO - PROJETO VISÃO

**Data:** 23/12/2024  
**Análise:** Via API GitHub  
**Parceria:** Claude + Lovable

---

## 📁 ESTRUTURA DO REPOSITÓRIO

```
vis-o/
├── 📁 .github/              # CI/CD e templates
│   ├── 📁 ISSUE_TEMPLATE/
│   ├── 📁 workflows/
│   │   ├── ci.yml          # CI pipeline
│   │   └── deploy.yml      # Deploy pipeline
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── 📁 .husky/               # Git hooks
│   ├── commit-msg
│   └── pre-commit
├── 📁 docker/               # Docker configs
│   ├── docker-compose.mediamtx.yml
│   ├── mediamtx.yml
│   └── nginx.conf
├── 📁 docs/                 # Documentação (28 arquivos)
├── 📁 public/               # Assets públicos
│   ├── 📁 icons/
│   ├── 📁 models/           # Modelos face-api.js
│   ├── 📁 sounds/           # Sons de alerta
│   ├── favicon.ico
│   ├── manifest.json
│   └── service-worker.ts
├── 📁 src/                  # Código fonte
│   ├── 📁 components/       # 93 componentes + 49 UI
│   ├── 📁 config/
│   ├── 📁 contexts/         # 4 contexts
│   ├── 📁 data/             # Mock data
│   ├── 📁 hooks/            # 64 hooks
│   ├── 📁 integrations/     # Supabase, Bitrix24
│   ├── 📁 lib/              # 20 libraries
│   ├── 📁 pages/            # 22 páginas
│   ├── 📁 test/
│   └── 📁 types/            # 9 tipos
├── 📁 supabase/
│   ├── 📁 functions/        # 9 Edge Functions
│   ├── 📁 migrations/       # 18 migrations
│   ├── config.toml
│   └── seed.sql
└── [arquivos de config]
```

---

## 📊 ESTATÍSTICAS GERAIS

| Categoria | Quantidade |
|-----------|------------|
| **Componentes** | 93 |
| **Componentes UI (Shadcn)** | 49 |
| **Hooks** | 64 |
| **Páginas** | 22 |
| **Libraries** | 20 |
| **Types** | 9 |
| **Contexts** | 4 |
| **Edge Functions** | 9 |
| **Migrations** | 18 |
| **Testes de Componentes** | 19 |
| **Testes de Hooks** | 40 |
| **Documentos** | 28 |
| **TOTAL** | ~375 arquivos |

---

## 📦 COMPONENTES (93)

### Componentes Principais
| Componente | Tamanho | Função |
|------------|---------|--------|
| SearchDropdown.tsx | 37.3KB | Busca global com filtros |
| Dashboard.tsx | 25.0KB | Dashboard principal |
| ClipGallery.tsx | 23.6KB | Galeria de clips gravados |
| AnalysisHistoryTable.tsx | 23.4KB | Histórico de análises |
| MultiCameraRecognition.tsx | 23.1KB | Reconhecimento multi-câmera |
| NotificationSecretsConfig.tsx | 22.9KB | Config de notificações |
| CameraWithContinuousAnalysis.tsx | 22.3KB | Câmera com análise contínua |
| VideoStreamPlayer.tsx | 22.1KB | Player de stream |
| StreamConfigPanel.tsx | 21.6KB | Config de streaming |
| ContinuousAnalysisPanel.tsx | 20.0KB | Painel de análise |
| HeatmapVisualization.tsx | 19.7KB | Visualização heatmap |
| ALPRDashboard.tsx | 18.8KB | Dashboard ALPR |
| HLSStreamGrid.tsx | 18.6KB | Grid de streams HLS |
| LicensePlateRecognition.tsx | 18.6KB | Reconhecimento de placas |
| RecognitionAnalytics.tsx | 18.5KB | Analytics de reconhecimento |

### Componentes de UI (via Lovable/Shadcn) - 49
- accordion, alert-dialog, alert, aspect-ratio, avatar
- badge, breadcrumb, button, calendar, card
- carousel, chart, checkbox, collapsible, command
- context-menu, dialog, drawer, dropdown-menu, form
- hover-card, input-otp, input, label, menubar
- navigation-menu, pagination, popover, progress, radio-group
- resizable, scroll-area, select, separator, sheet
- sidebar, skeleton, slider, sonner, switch
- table, tabs, textarea, toast, toaster
- toggle-group, toggle, tooltip, use-toast

### Componentes Utilitários
- EmptyState, ErrorState, LoadingSpinner, LoadingOverlay
- PageWrapper, PageHeader, StatCard, MetricCard
- StatusBadge, SeverityBadge, StatusIndicator
- ConfirmDialog, DataTable, SearchBar, TimeAgo
- CopyButton, CountUp, ProgressRing, UserAvatar

---

## 🪝 HOOKS (64)

### Hooks de Domínio (Core Business)
| Hook | Tamanho | Função |
|------|---------|--------|
| useContinuousAnalysis.ts | 24.9KB | Análise contínua de vídeo |
| usePPEDetection.ts | 19.3KB | Detecção de EPIs |
| useFaceRecognition.ts | 18.4KB | Reconhecimento facial |
| useZoneDetection.ts | 17.9KB | Detecção em zonas |
| useVideoStream.ts | 17.3KB | Gerenciamento de streams |
| useSettings.ts | 16.8KB | Configurações do sistema |
| useClipRecorder.ts | 15.6KB | Gravação de clips |
| useFaceAPI.ts | 14.2KB | API face-api.js |
| useGlobalStreaming.tsx | 14.2KB | Streaming global |
| useNotifications.ts | 13.2KB | Sistema de notificações |
| usePlateDetections.ts | 11.8KB | Detecção de placas |
| useStreamFaceDetection.ts | 11.0KB | Detecção facial em stream |
| useNotificationFlow.ts | 10.4KB | Fluxo de notificações |
| useHeatmap.tsx | 12.6KB | Mapas de calor |
| useKeyboardShortcuts.ts | 9.4KB | Atalhos de teclado |
| useFaceRecognitionAlerts.ts | 9.4KB | Alertas faciais |

### Hooks de Dados (CRUD)
- useCameras, useAlerts, useRules, useRuleActions
- useAnalysisConfigs, usePPEConfigs, useRecordingConfigs
- useCameraSnapshots, useHeatmapSnapshots
- useStreamRecordings, useRecordingSessions
- useNotificationHistory, useNotificationTemplates
- useRealtimeAlerts, useRealtimeRecognition

### Hooks Utilitários
- useDebounce, useLocalStorage, useMediaQuery
- useOnClickOutside, usePrevious, useToggle
- useInterval, useTimeout, useDocumentTitle
- useWindowSize, useOnlineStatus, useFeatureFlags
- usePermissions, useCopyToClipboard, usePerformance
- useScrollPosition, useAsync, useMounted
- useEventListener, useLatest, useUpdateEffect

---

## 📄 PÁGINAS (22)

| Página | Tamanho | Função |
|--------|---------|--------|
| ZonesPage.tsx | 46.0KB | Gerenciamento de zonas |
| PeoplePage.tsx | 43.9KB | Cadastro de pessoas |
| SettingsPage.tsx | 38.9KB | Configurações gerais |
| SecurityPage.tsx | 33.2KB | Configurações de segurança |
| CamerasPage.tsx | 30.5KB | Gerenciamento de câmeras |
| DashboardV2.tsx | 29.4KB | Dashboard principal |
| RecordingsPage.tsx | 28.8KB | Gravações |
| AlertsPage.tsx | 27.0KB | Central de alertas |
| AnalyticsPage.tsx | 26.9KB | Analytics e relatórios |
| RecognitionLogsPage.tsx | 24.8KB | Logs de reconhecimento |
| NotificationSettingsPage.tsx | 24.7KB | Config notificações |
| PPEPage.tsx | 21.1KB | Detecção de EPIs |
| FaceRecognitionPage.tsx | 11.9KB | Reconhecimento facial |
| Auth.tsx | 11.6KB | Autenticação |
| StreamSettingsPage.tsx | 9.4KB | Config de streams |
| Index.tsx | 3.0KB | Página inicial |
| RecognitionAnalyticsPage.tsx | 2.5KB | Analytics reconhecimento |
| LicensePlatePage.tsx | 1.7KB | Placas veiculares |
| ReportsPage.tsx | 0.8KB | Relatórios |
| TelegramSettingsPage.tsx | 0.8KB | Config Telegram |
| NotFound.tsx | 0.7KB | 404 |

---

## ⚡ EDGE FUNCTIONS (9)

| Função | Tamanho | Propósito |
|--------|---------|-----------|
| compare-faces | 10.8KB | Comparação facial |
| send-alert-notification | 9.2KB | Envio de alertas |
| detect-faces | 6.0KB | Detecção de faces |
| analyze-image | 5.4KB | Análise de imagem |
| analyze-license-plate | 5.1KB | Análise de placa |
| generate-face-encoding | 4.3KB | Encoding facial |
| send-telegram | 3.2KB | Notificação Telegram |
| get-mapbox-token | 1.1KB | Token Mapbox |
| _shared/validation.ts | 2.3KB | Validações compartilhadas |

---

## 🗃️ BANCO DE DADOS (18 migrations)

### Tabelas Identificadas
- **cameras** - Cadastro de câmeras
- **alerts** - Alertas do sistema
- **rules** - Regras de detecção
- **continuous_analysis_configs** - Config análise contínua
- **analysis_sessions** - Sessões de análise
- **analysis_history** - Histórico de análises
- **recording_configs** - Config de gravação
- **video_clips** - Clips gravados
- **notification_configs** - Config de notificações
- **notification_history** - Histórico de notificações
- **notification_templates** - Templates de notificação
- **people** - Cadastro de pessoas
- **face_encodings** - Encodings faciais
- **zones** - Zonas de detecção
- **ppe_configs** - Config de EPIs
- **heatmap_snapshots** - Snapshots de heatmap

---

## 📚 LIBRARIES (20)

| Library | Função |
|---------|--------|
| alertSounds.ts | Sons de alerta |
| browserNotifications.ts | Notificações do navegador |
| pdfGenerator.ts | Geração de PDFs |
| exportUtils.ts | Exportação de dados |
| formatters.ts | Formatadores de dados |
| validators.ts | Validadores |
| dateUtils.ts | Utilitários de data |
| colorUtils.ts | Utilitários de cor |
| arrayUtils.ts | Utilitários de array |
| stringUtils.ts | Utilitários de string |
| objectUtils.ts | Utilitários de objeto |
| storage.ts | LocalStorage wrapper |
| logger.ts | Sistema de logs |
| rateLimiter.ts | Rate limiting |
| retry.ts | Retry logic |
| apiError.ts | Tratamento de erros |
| eventEmitter.ts | Event emitter |
| constants.ts | Constantes |
| utils.ts | Utilitários gerais |
| index.ts | Barrel export |

---

## 🏷️ TYPES (9)

| Type File | Tamanho | Conteúdo |
|-----------|---------|----------|
| faceRecognition.ts | 12.9KB | Tipos de reconhecimento facial |
| zones.ts | 12.0KB | Tipos de zonas |
| clips.ts | 10.7KB | Tipos de clips |
| continuousAnalysis.ts | 10.6KB | Tipos de análise contínua |
| streaming.ts | 8.4KB | Tipos de streaming |
| extended.ts | 3.4KB | Tipos estendidos |
| rules.ts | 3.4KB | Tipos de regras |
| surveillance.ts | 1.8KB | Tipos de vigilância |
| index.ts | 0.7KB | Barrel export |

---

## 🌐 CONTEXTS (4)

| Context | Tamanho | Função |
|---------|---------|--------|
| i18n.tsx | 37.0KB | Internacionalização (pt-BR, en, es) |
| accessibility.tsx | 15.8KB | Acessibilidade |
| ThemeProvider.tsx | 10.1KB | Temas (dark/light) |
| AuthContext.tsx | 2.4KB | Autenticação |

---

## 🧪 TESTES (59)

### Testes de Hooks (40)
- Todos os hooks principais possuem testes

### Testes de Componentes (19)
- Dashboard, Header, Sidebar
- VideoPlayer, VideoStreamPlayer
- CameraCard, AlertCard, PersonCard
- SearchDropdown, ClipGallery
- MultiCameraRecognition, HeatmapVisualization
- ZoneEditor, RuleEditor, RulesPanel
- FloorPlanMap, NotificationsPanel
- CameraWithContinuousAnalysis, AnalyticsDashboard

---

## 🔀 ORIGEM DOS ARQUIVOS

### Via LOVABLE (geração automática)
- src/components/ui/* (49 componentes Shadcn)
- src/integrations/supabase/types.ts
- Estrutura base do projeto
- Configurações Tailwind/Vite
- Páginas e componentes iniciais

### Via CLAUDE (commits manuais)
- docs/* (28 documentos)
- Testes (59 arquivos)
- Hooks utilitários
- DevOps configs (.husky, workflows)
- Melhorias e refatorações
- Correções de tipos e console.log

---

## 📊 MÉTRICAS FINAIS

| Métrica | Valor |
|---------|-------|
| Total de arquivos | ~375 |
| Linhas de código (estimado) | ~50.000 |
| Cobertura de testes | ~60% |
| Componentes reutilizáveis | 142 |
| Hooks customizados | 64 |
| Edge Functions | 9 |
| Migrations | 18 |
| Documentos | 28 |

---

*Inventário gerado em 23/12/2024 via análise automática da API GitHub*
