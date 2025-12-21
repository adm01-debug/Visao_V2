# 📋 INVENTÁRIO EXAUSTIVO DO PROJETO VISÃO
## Sistema de Vigilância Inteligente com IA

**Data da Análise:** 2024-12-21  
**Versão do Documento:** 1.0  
**Projeto:** VISÃO - Sistema de Vigilância por Câmeras com Inteligência Artificial  
**Stack:** React + Vite + TypeScript + Tailwind CSS + Supabase (Lovable Cloud)

---

## 📁 ESTRUTURA DE DIRETÓRIOS

```
visao/
├── .github/                    # Configurações GitHub
│   ├── CODEOWNERS
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml              # CI Pipeline
│       └── deploy.yml          # Deploy Pipeline
├── docker/                     # Configurações Docker
│   ├── docker-compose.mediamtx.yml
│   ├── mediamtx.yml
│   └── nginx.conf
├── docs/                       # Documentação
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── AUDITORIA_EXAUSTIVA_2024-12-21.md
│   ├── AUDITORIA_MELHORIAS_2024-12-21.md
│   ├── COMPONENTS.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── DEPLOY_GUIDE.md
│   ├── HOOKS.md
│   ├── INVENTARIO_COMPLETO.md
│   ├── MEDIAMTX_SETUP.md
│   ├── MELHORIAS_CONCLUIDAS.md
│   ├── MELHORIAS_PENDENTES.md
│   └── MELHORIAS_PENDENTES_REAIS.md
├── public/                     # Assets Públicos
│   ├── icons/
│   │   ├── README.md
│   │   ├── apple-touch-icon.png
│   │   ├── icon-*.png (vários tamanhos)
│   │   └── maskable-icon.png
│   ├── models/
│   │   └── README.md
│   ├── sounds/
│   │   ├── README.md
│   │   ├── alert.mp3
│   │   ├── notification.mp3
│   │   ├── success.mp3
│   │   └── warning.mp3
│   ├── manifest.json           # PWA Manifest
│   ├── robots.txt
│   ├── service-worker.ts
│   └── sw.js
├── src/                        # Código Fonte Principal
│   ├── components/             # Componentes React (~90+ arquivos)
│   ├── contexts/               # Contextos React
│   ├── data/                   # Dados Mock
│   ├── hooks/                  # Custom Hooks (~50+ arquivos)
│   ├── integrations/           # Integrações
│   ├── lib/                    # Utilitários
│   ├── pages/                  # Páginas da Aplicação
│   ├── types/                  # Definições TypeScript
│   ├── config/                 # Configurações
│   ├── App.tsx
│   ├── App.css
│   ├── AppRoutes.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── supabase/                   # Backend Supabase
│   ├── config.toml
│   ├── functions/              # Edge Functions
│   │   ├── _shared/
│   │   ├── analyze-image/
│   │   ├── analyze-license-plate/
│   │   ├── compare-faces/
│   │   ├── detect-faces/
│   │   ├── generate-face-encoding/
│   │   ├── get-mapbox-token/
│   │   ├── send-alert-notification/
│   │   └── send-telegram/
│   └── seed.sql
└── Arquivos de Configuração Raiz
```

---

## 🎨 COMPONENTES (src/components/)

### Componentes Principais de UI
| Arquivo | Descrição | Funcionalidade |
|---------|-----------|----------------|
| `AIAnalysisPanel.tsx` | Painel de análise com IA | Exibe resultados de análise de imagem com IA |
| `ALPRDashboard.tsx` | Dashboard de reconhecimento de placas | Monitoramento de placas veiculares |
| `AlertCard.tsx` | Card de alerta | Exibe informações de alertas individuais |
| `AlertFilters.tsx` | Filtros de alertas | Componente de filtros para lista de alertas |
| `AlertTrendsChart.tsx` | Gráfico de tendências | Visualização de tendências de alertas |
| `AlertsByCameraChart.tsx` | Gráfico por câmera | Alertas agrupados por câmera |
| `AnalysisHistoryTable.tsx` | Tabela de histórico | Histórico de análises realizadas |
| `AnalyticsDashboard.tsx` | Dashboard analítico | Painel principal de analytics |
| `BlacklistAlertBanner.tsx` | Banner de blacklist | Alertas de pessoas/placas na blacklist |
| `Breadcrumbs.tsx` | Navegação breadcrumb | Trilha de navegação |
| `CameraCard.tsx` | Card de câmera | Exibe informações de câmera individual |
| `CameraLayoutControls.tsx` | Controles de layout | Controles para layout de câmeras |
| `CameraMap.tsx` | Mapa de câmeras | Visualização geográfica de câmeras |
| `CameraModal.tsx` | Modal de câmera | Detalhes e configurações de câmera |
| `CameraWithContinuousAnalysis.tsx` | Câmera com análise contínua | Streaming com análise em tempo real |
| `CardSkeleton.tsx` | Skeleton de card | Loading state para cards |
| `ClipGallery.tsx` | Galeria de clips | Galeria de gravações |
| `ClipRecorderControls.tsx` | Controles de gravação | Interface de gravação de clips |
| `ConfirmDialog.tsx` | Dialog de confirmação | Confirmação de ações |
| `ContinuousAnalysisPanel.tsx` | Painel de análise contínua | Configuração de análise contínua |
| `CopyButton.tsx` | Botão de cópia | Copiar para clipboard |
| `CountUp.tsx` | Animação de contagem | Contagem animada de números |
| `Dashboard.tsx` | Dashboard principal | Tela inicial do sistema |
| `DateRangePicker.tsx` | Seletor de período | Seleção de intervalo de datas |
| `Divider.tsx` | Divisor visual | Linha divisória |
| `EmptyState.tsx` | Estado vazio | UI para listas vazias |
| `ErrorBoundary.tsx` | Boundary de erro | Captura de erros React |
| `ErrorState.tsx` | Estado de erro | UI para estados de erro |
| `EventTimeline.tsx` | Timeline de eventos | Linha do tempo de eventos |
| `ExportMenu.tsx` | Menu de exportação | Exportação de dados |
| `FaceRecognitionOverlay.tsx` | Overlay de faces | Overlay para reconhecimento facial |
| `FilterDropdown.tsx` | Dropdown de filtros | Componente genérico de filtros |
| `FloorPlanMap.tsx` | Mapa de planta baixa | Visualização de planta do local |
| `HLSStreamGrid.tsx` | Grid de streams HLS | Grid de múltiplos streams |
| `Header.tsx` | Cabeçalho | Header principal da aplicação |
| `HeatmapVisualization.tsx` | Visualização heatmap | Mapa de calor de movimentação |
| `HighlightText.tsx` | Texto destacado | Destaque de termos de busca |
| `InfoTooltip.tsx` | Tooltip informativo | Tooltips com informações |
| `KeyValue.tsx` | Par chave-valor | Exibição de dados |
| `KeyboardShortcutsHelp.tsx` | Ajuda de atalhos | Modal de atalhos de teclado |
| `LanguageSelector.tsx` | Seletor de idioma | Troca de idioma |
| `LicensePlateRecognition.tsx` | Reconhecimento de placas | UI de reconhecimento ALPR |
| `LiveFaceRecognition.tsx` | Reconhecimento facial ao vivo | Face recognition em tempo real |
| `LoadingSpinner.tsx` | Spinner de loading | Indicador de carregamento |
| `MultiCameraRecognition.tsx` | Multi-câmera recognition | Reconhecimento em múltiplas câmeras |
| `NavLink.tsx` | Link de navegação | Links estilizados |
| `NotificationBell.tsx` | Sino de notificações | Ícone de notificações |
| `NotificationSecretsConfig.tsx` | Config de secrets | Configuração de segredos para notificações |
| `NotificationsPanel.tsx` | Painel de notificações | Lista de notificações |
| `OnboardingTour.tsx` | Tour de onboarding | Tutorial guiado para novos usuários |
| `PageHeader.tsx` | Header de página | Cabeçalho de páginas internas |
| `PageSkeletons.tsx` | Skeletons de página | Loading states de páginas |
| `PageWrapper.tsx` | Wrapper de página | Container de páginas |
| `Pagination.tsx` | Paginação | Navegação paginada |
| `PaginationControls.tsx` | Controles de paginação | Controles avançados |
| `PersonCard.tsx` | Card de pessoa | Exibe info de pessoa cadastrada |
| `PreferencesPanel.tsx` | Painel de preferências | Configurações do usuário |
| `ProgressRing.tsx` | Anel de progresso | Indicador circular |
| `ProtectedRoute.tsx` | Rota protegida | Guard de autenticação |
| `RecognitionAnalytics.tsx` | Analytics de recognition | Estatísticas de reconhecimento |
| `ReportsPanel.tsx` | Painel de relatórios | Geração de relatórios |
| `RuleCard.tsx` | Card de regra | Exibe regra de automação |
| `RuleEditor.tsx` | Editor de regras | Criação/edição de regras |
| `RulesPanel.tsx` | Painel de regras | Lista de regras |
| `SearchDropdown.tsx` | Dropdown de busca | Busca com dropdown |
| `SearchInput.tsx` | Input de busca | Campo de busca |
| `SeverityBadge.tsx` | Badge de severidade | Indicador de gravidade |
| `Sidebar.tsx` | Barra lateral | Menu lateral principal |
| `SkipLink.tsx` | Link de pular | Acessibilidade - pular para conteúdo |
| `SoundSettingsPanel.tsx` | Config de sons | Configurações de alertas sonoros |
| `StatCard.tsx` | Card de estatística | Card com métricas |
| `StatsCard.tsx` | Card de stats | Variação de StatCard |
| `StatusBadge.tsx` | Badge de status | Indicador de status |
| `StatusIndicator.tsx` | Indicador de status | Indicador visual de status |
| `StreamConfigPanel.tsx` | Config de stream | Configuração de streaming |
| `StreamingCameraGrid.tsx` | Grid de câmeras | Grid de câmeras em streaming |
| `TableSkeleton.tsx` | Skeleton de tabela | Loading state para tabelas |
| `TelegramConfigPanel.tsx` | Config Telegram | Configuração de bot Telegram |
| `ThemeToggle.tsx` | Toggle de tema | Alternador dark/light mode |
| `TimeAgo.tsx` | Tempo relativo | Exibição "há X minutos" |
| `TourHighlight.tsx` | Destaque do tour | Highlight para onboarding |
| `UserAvatar.tsx` | Avatar de usuário | Componente de avatar |
| `VideoPlayer.tsx` | Player de vídeo | Player com timeline e controles |
| `VideoStreamPlayer.tsx` | Player de stream | Player para streams ao vivo |
| `VisuallyHidden.tsx` | Elemento oculto | Acessibilidade - texto para screen readers |
| `WebcamCapture.tsx` | Captura de webcam | Captura de imagem da webcam |
| `ZoneEditor.tsx` | Editor de zonas | Desenho de zonas de interesse |
| `ZoneOverlay.tsx` | Overlay de zonas | Exibição de zonas sobre vídeo |

### Componentes UI (Shadcn/ui)
| Arquivo | Descrição |
|---------|-----------|
| `accordion.tsx` | Accordion colapsável |
| `alert-dialog.tsx` | Dialog de alerta |
| `alert.tsx` | Componente de alerta |
| `aspect-ratio.tsx` | Proporção de aspecto |
| `avatar.tsx` | Avatar |
| `badge.tsx` | Badge/etiqueta |
| `breadcrumb.tsx` | Breadcrumb |
| `button.tsx` | Botão |
| `calendar.tsx` | Calendário |
| `card.tsx` | Card |
| `carousel.tsx` | Carrossel |
| `chart.tsx` | Gráficos |
| `checkbox.tsx` | Checkbox |
| `collapsible.tsx` | Colapsável |
| `command.tsx` | Command palette |
| `context-menu.tsx` | Menu de contexto |
| `dialog.tsx` | Dialog/Modal |
| `drawer.tsx` | Drawer |
| `dropdown-menu.tsx` | Menu dropdown |
| `form.tsx` | Formulário |
| `hover-card.tsx` | Card de hover |
| `input-otp.tsx` | Input OTP |
| `input.tsx` | Input de texto |
| `label.tsx` | Label |
| `menubar.tsx` | Barra de menu |
| `navigation-menu.tsx` | Menu de navegação |
| `pagination.tsx` | Paginação |
| `popover.tsx` | Popover |
| `progress.tsx` | Barra de progresso |
| `radio-group.tsx` | Grupo de radio |
| `resizable.tsx` | Painéis redimensionáveis |
| `scroll-area.tsx` | Área de scroll |
| `select.tsx` | Select |
| `separator.tsx` | Separador |
| `sheet.tsx` | Sheet |
| `sidebar.tsx` | Barra lateral |
| `skeleton.tsx` | Skeleton loader |
| `slider.tsx` | Slider |
| `sonner.tsx` | Toast (Sonner) |
| `switch.tsx` | Switch |
| `table.tsx` | Tabela |
| `tabs.tsx` | Abas |
| `textarea.tsx` | Área de texto |
| `toast.tsx` | Toast |
| `toaster.tsx` | Toaster container |
| `toggle-group.tsx` | Grupo de toggles |
| `toggle.tsx` | Toggle |
| `tooltip.tsx` | Tooltip |
| `use-toast.ts` | Hook de toast |

---

## 🪝 CUSTOM HOOKS (src/hooks/)

### Hooks de Dados e Estado
| Hook | Descrição | Funcionalidades |
|------|-----------|-----------------|
| `useAlerts.ts` | Gerenciamento de alertas | CRUD de alertas, filtros, ordenação |
| `useAnalysisConfigs.ts` | Configs de análise | Configurações de análise de IA |
| `useBlacklistAlerts.ts` | Alertas de blacklist | Monitoramento de blacklist |
| `useCameraSnapshots.ts` | Snapshots de câmera | Captura de frames |
| `useCameras.ts` | Gerenciamento de câmeras | CRUD de câmeras |
| `useClipRecorder.ts` | Gravação de clips | Gravação de vídeo |
| `useContinuousAnalysis.ts` | Análise contínua | Análise em tempo real |
| `useFaceAPI.ts` | Face API | Integração face-api.js |
| `useFaceDetection.ts` | Detecção de faces | Detecção facial |
| `useFaceRecognition.ts` | Reconhecimento facial | Identificação de pessoas |
| `useFaceRecognitionAlerts.ts` | Alertas de face | Alertas de reconhecimento |
| `useFeatureFlags.ts` | Feature flags | Flags de funcionalidades |
| `useGlobalStreaming.tsx` | Streaming global | Estado global de streams |
| `useHeatmap.tsx` | Heatmap | Geração de mapas de calor |
| `useHeatmapSnapshots.ts` | Snapshots heatmap | Snapshots para heatmap |
| `useImageAnalysis.ts` | Análise de imagem | Análise com IA |
| `useMLModels.ts` | Modelos ML | Carregamento de modelos TensorFlow |
| `useMapboxToken.ts` | Token Mapbox | Obtenção do token Mapbox |
| `useMediaMTX.ts` | MediaMTX | Integração com servidor de streaming |
| `useNotificationFlow.ts` | Fluxo de notificações | Orquestração de notificações |
| `useNotificationHistory.ts` | Histórico de notificações | Histórico persistido |
| `useNotificationTemplates.ts` | Templates | Templates de notificação |
| `useNotifications.ts` | Notificações | Sistema de notificações |
| `useOnboardingTour.ts` | Tour de onboarding | Tutorial guiado |
| `usePPEConfigs.ts` | Configs de PPE | Configurações de EPIs |
| `usePPEDetection.ts` | Detecção de PPE | Detecção de equipamentos |
| `usePlateDetections.ts` | Detecções de placa | Reconhecimento ALPR |
| `useRealtimeAlerts.ts` | Alertas realtime | Alertas em tempo real |
| `useRealtimeRecognition.ts` | Recognition realtime | Reconhecimento em tempo real |
| `useRecordingConfigs.ts` | Configs de gravação | Configurações de gravação |
| `useRecordingSessions.ts` | Sessões de gravação | Gerenciamento de sessões |
| `useRuleActions.ts` | Ações de regras | Execução de ações |
| `useRuleViolations.ts` | Violações de regras | Monitoramento de violações |
| `useRules.ts` | Regras | CRUD de regras de automação |
| `useSettings.ts` | Configurações | Configurações do sistema |
| `useStorage.ts` | Storage | Armazenamento de arquivos |
| `useStreamFaceDetection.ts` | Face em stream | Detecção facial em streams |
| `useStreamRecordings.ts` | Gravações de stream | Gravações de streams |
| `useVideoStream.ts` | Stream de vídeo | Gerenciamento de streams |
| `useZoneDetection.ts` | Detecção de zonas | Detecção em zonas |

### Hooks Utilitários
| Hook | Descrição |
|------|-----------|
| `use-mobile.tsx` | Detecção de dispositivo móvel |
| `use-toast.ts` | Sistema de toasts |
| `useCopyToClipboard.ts` | Copiar para clipboard |
| `useDebounce.ts` | Debounce de valores |
| `useDocumentTitle.ts` | Título da página |
| `useInterval.ts` | Intervalos |
| `useKeyboardShortcuts.ts` | Atalhos de teclado |
| `useLocalStorage.ts` | LocalStorage tipado |
| `useMediaQuery.ts` | Media queries |
| `useOnClickOutside.ts` | Clique fora do elemento |
| `useOnlineStatus.ts` | Status de conexão |
| `usePerformance.ts` | Monitoramento de performance |
| `usePermissions.ts` | Permissões de usuário |
| `usePrevious.ts` | Valor anterior |
| `useScrollPosition.ts` | Posição de scroll |
| `useTimeout.ts` | Timeouts |
| `useToggle.ts` | Toggle de estado |
| `useWindowSize.ts` | Tamanho da janela |

---

## 📄 PÁGINAS (src/pages/)

| Arquivo | Rota | Descrição |
|---------|------|-----------|
| `AlertsPage.tsx` | `/alerts` | Lista e gerenciamento de alertas |
| `AnalyticsPage.tsx` | `/analytics` | Dashboard analítico |
| `Auth.tsx` | `/auth` | Autenticação (login/signup) |
| `CamerasPage.tsx` | `/cameras` | Gerenciamento de câmeras |
| `DashboardV2.tsx` | `/dashboard` | Dashboard principal v2 |
| `FaceRecognitionPage.tsx` | `/face-recognition` | Reconhecimento facial |
| `HeatmapPage.tsx` | `/heatmap` | Visualização de heatmaps |
| `Index.tsx` | `/` | Página inicial |
| `LicensePlatePage.tsx` | `/license-plate` | Reconhecimento de placas |
| `NotFound.tsx` | `*` | Página 404 |
| `NotificationSettingsPage.tsx` | `/notifications/settings` | Configurações de notificação |
| `PPEPage.tsx` | `/ppe` | Detecção de EPIs |
| `PeoplePage.tsx` | `/people` | Cadastro de pessoas |
| `RecognitionAnalyticsPage.tsx` | `/recognition/analytics` | Analytics de reconhecimento |
| `RecognitionLogsPage.tsx` | `/recognition/logs` | Logs de reconhecimento |
| `RecordingsPage.tsx` | `/recordings` | Gravações |
| `ReportsPage.tsx` | `/reports` | Relatórios |
| `SecurityPage.tsx` | `/security` | Configurações de segurança |
| `SettingsPage.tsx` | `/settings` | Configurações gerais |
| `StreamSettingsPage.tsx` | `/streams/settings` | Config de streaming |
| `TelegramSettingsPage.tsx` | `/telegram` | Config de Telegram |
| `ZonesPage.tsx` | `/zones` | Gerenciamento de zonas |

---

## 🔌 EDGE FUNCTIONS (supabase/functions/)

| Função | Arquivo | Descrição | Pública |
|--------|---------|-----------|---------|
| `_shared` | `validation.ts` | Utilitários compartilhados | N/A |
| `analyze-image` | `index.ts` | Análise de imagem com IA | Não |
| `analyze-license-plate` | `index.ts` | Análise ALPR | Não |
| `compare-faces` | `index.ts` | Comparação de faces | Não |
| `detect-faces` | `index.ts` | Detecção de faces | Não |
| `generate-face-encoding` | `index.ts` | Geração de encoding facial | Não |
| `get-mapbox-token` | `index.ts` | Obter token Mapbox | Sim |
| `send-alert-notification` | `index.ts` | Envio de notificações | Não |
| `send-telegram` | `index.ts` | Envio para Telegram | Não |

---

## 🗄️ BANCO DE DADOS (Supabase)

### Tabelas
| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `alerts` | Alertas do sistema | ✅ |
| `analysis_history` | Histórico de análises | ✅ |
| `cameras` | Câmeras cadastradas | ✅ |
| `face_recognition_configs` | Configs de reconhecimento facial | ✅ |
| `notification_configs` | Configs de notificações | ✅ |
| `plate_detections` | Detecções de placas | ✅ |
| `profiles` | Perfis de usuário | ✅ |
| `recognition_logs` | Logs de reconhecimento | ✅ |
| `registered_persons` | Pessoas cadastradas | ✅ |
| `registered_plates` | Placas cadastradas | ✅ |
| `rules` | Regras de automação | ✅ |
| `video_clips` | Clips de vídeo | ✅ |
| `zone_events` | Eventos de zona | ✅ |
| `zones` | Zonas de interesse | ✅ |

### Storage Buckets
| Bucket | Público | Uso |
|--------|---------|-----|
| `person-photos` | Sim | Fotos de pessoas cadastradas |
| `camera-thumbnails` | Sim | Thumbnails de câmeras |

### Secrets Configurados
- `LOVABLE_API_KEY`
- `MAPBOX_PUBLIC_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_PUBLISHABLE_KEY`

---

## 📚 BIBLIOTECAS PRINCIPAIS

### Core
- React 18.3.1
- TypeScript 5.8.3
- Vite 5.4.19

### UI/Styling
- Tailwind CSS 3.4.17
- Shadcn/ui (Radix UI)
- Lucide Icons 0.462.0

### Estado/Dados
- TanStack React Query 5.83.0
- Supabase JS 2.89.0
- React Hook Form 7.61.1
- Zod 3.25.76

### IA/ML
- TensorFlow.js 4.17.0
- Face-api.js 0.22.2
- COCO-SSD 2.2.3
- Pose Detection 2.1.3

### Mídia
- HLS.js 1.6.15
- Mapbox GL 3.17.0
- html2canvas 1.4.1
- jsPDF 3.0.4

### Utilitários
- date-fns 3.6.0
- clsx 2.1.1
- tailwind-merge 2.6.0
- Sonner 1.7.4

---

## 🧪 TESTES

### Localização
- `src/components/__tests__/` - Testes de componentes
- `src/hooks/__tests__/` - Testes de hooks

### Arquivos de Teste
- 40+ arquivos de teste para hooks
- 6 arquivos de teste para componentes

---

## 📋 TIPOS (src/types/)

| Arquivo | Descrição |
|---------|-----------|
| `clips.ts` | Tipos para clips de vídeo |
| `continuousAnalysis.ts` | Tipos para análise contínua |
| `extended.ts` | Tipos estendidos |
| `faceRecognition.ts` | Tipos para face recognition |
| `index.ts` | Exportações centralizadas |
| `rules.ts` | Tipos para regras |
| `streaming.ts` | Tipos para streaming |
| `surveillance.ts` | Tipos gerais de vigilância |
| `zones.ts` | Tipos para zonas |

---

## 🔧 UTILITÁRIOS (src/lib/)

| Arquivo | Descrição |
|---------|-----------|
| `alertSounds.ts` | Sistema de sons de alerta |
| `apiError.ts` | Tratamento de erros de API |
| `arrayUtils.ts` | Utilitários de arrays |
| `browserNotifications.ts` | Notificações do navegador |
| `colorUtils.ts` | Utilitários de cores |
| `constants.ts` | Constantes globais |
| `dateUtils.ts` | Utilitários de data |
| `eventEmitter.ts` | Event emitter |
| `exportUtils.ts` | Exportação de dados |
| `formatters.ts` | Formatadores |
| `index.ts` | Exportações |
| `logger.ts` | Sistema de logging |
| `objectUtils.ts` | Utilitários de objetos |
| `pdfGenerator.ts` | Geração de PDFs |
| `rateLimiter.ts` | Rate limiting |
| `retry.ts` | Retry logic |
| `storage.ts` | Storage utilities |
| `stringUtils.ts` | Utilitários de strings |
| `utils.ts` | Utilitários gerais |
| `validators.ts` | Validadores |

---

## 🔐 CONTEXTOS (src/contexts/)

| Arquivo | Descrição |
|---------|-----------|
| `AuthContext.tsx` | Contexto de autenticação |
| `ThemeProvider.tsx` | Provider de tema |
| `accessibility.tsx` | Contexto de acessibilidade |
| `i18n.tsx` | Internacionalização |

---

## 📝 OBSERVAÇÕES

### Arquivos Criados pelo Claude (via GitHub API)
Os seguintes arquivos podem ter sido adicionados diretamente pelo Claude no repositório:
- Documentação em `/docs/`
- Arquivos de configuração adicionais
- Alguns componentes e hooks específicos

### Status do Build
⚠️ **ATENÇÃO:** O projeto apresenta erros de build que precisam ser corrigidos:
1. Conflitos de importação em Edge Functions (`corsHeaders`)
2. Erros de sintaxe em páginas principais

### Próximos Passos
1. Corrigir erros de build
2. Sincronizar arquivos entre repositório e Lovable
3. Validar integridade de todas as funcionalidades

---

**Documento gerado automaticamente pelo sistema de análise Lovable.**
