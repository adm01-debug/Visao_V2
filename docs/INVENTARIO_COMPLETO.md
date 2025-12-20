# 📋 INVENTÁRIO COMPLETO DO REPOSITÓRIO VISÃO

**Data da Análise:** 20 de Dezembro de 2025
**Repositório:** https://github.com/adm01-debug/vis-o
**Tamanho Total:** 895 KB
**Linguagem Principal:** TypeScript
**Framework:** React + Vite + Tailwind CSS
**Backend:** Supabase (PostgreSQL + Edge Functions)

---

## 📊 RESUMO EXECUTIVO

| Categoria | Quantidade | Tamanho |
|-----------|------------|---------|
| Componentes (src/components) | 59 arquivos | 731.3 KB |
| Componentes UI (shadcn) | 49 arquivos | 142.8 KB |
| Hooks | 33 arquivos | 322.2 KB |
| Páginas | 21 arquivos | 389.2 KB |
| Contextos | 4 arquivos | 56.7 KB |
| Tipos TypeScript | 7 arquivos | 58.5 KB |
| Edge Functions | 8 funções | ~45 KB |
| Migrations SQL | 17 arquivos | 106.7 KB |
| **TOTAL CÓDIGO** | **~200 arquivos** | **~1.9 MB** |

---

## 🔀 CONTRIBUIÇÕES POR ORIGEM

| Origem | Commits | Porcentagem |
|--------|---------|-------------|
| 🔵 Claude (adm01-debug) | ~87 | ~43% |
| ⚪ Lovable (gpt-engineer-app) | ~113 | ~57% |
| **TOTAL** | **~200** | **100%** |

---

## 📁 ESTRUTURA COMPLETA DE PASTAS

```
vis-o/
├── 📂 docker/
│   ├── docker-compose.mediamtx.yml (1,192 B)
│   └── mediamtx.yml (6,120 B)
│
├── 📂 docs/
│   ├── DEPLOY_GUIDE.md (8,691 B)
│   ├── MEDIAMTX_SETUP.md (5,442 B)
│   └── MELHORIAS_PENDENTES.md (11,322 B)
│
├── 📂 public/
│   ├── favicon.ico (20,373 B)
│   ├── manifest.json (2,575 B)
│   ├── placeholder.svg (3,253 B)
│   ├── robots.txt (160 B)
│   └── service-worker.ts (11,428 B)
│
├── 📂 src/
│   ├── 📂 components/ (59 arquivos + ui/)
│   ├── 📂 contexts/ (4 arquivos)
│   ├── 📂 data/ (2 arquivos)
│   ├── 📂 hooks/ (33 arquivos)
│   ├── 📂 integrations/ (supabase + bitrix24)
│   ├── 📂 lib/ (5 arquivos)
│   ├── 📂 pages/ (21 arquivos)
│   ├── 📂 types/ (7 arquivos)
│   ├── App.css
│   ├── App.tsx
│   ├── AppRoutes.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── 📂 supabase/
│   ├── config.toml
│   ├── 📂 functions/ (8 Edge Functions)
│   └── 📂 migrations/ (17 arquivos SQL)
│
├── .env
├── .gitignore
├── README.md
├── bun.lockb
├── components.json
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 📦 COMPONENTES (src/components/)

### Componentes Principais (59 arquivos - 731.3 KB)

| Arquivo | Tamanho | Origem | Descrição |
|---------|---------|--------|-----------|
| AIAnalysisPanel.tsx | 11,959 B | Lovable | Painel de análise por IA |
| ALPRDashboard.tsx | 19,257 B | Lovable | Dashboard de placas veiculares |
| AlertCard.tsx | 3,383 B | Lovable | Card de alerta individual |
| AlertFilters.tsx | 11,415 B | Lovable | Filtros avançados de alertas |
| AlertTrendsChart.tsx | 9,647 B | Lovable | Gráfico de tendências de alertas |
| AlertsByCameraChart.tsx | 7,520 B | Lovable | Gráfico de alertas por câmera |
| AnalysisHistoryTable.tsx | 23,833 B | 🔵 Claude | Tabela de histórico de análises |
| AnalyticsDashboard.tsx | 17,949 B | Lovable | Dashboard de analytics |
| BlacklistAlertBanner.tsx | 8,120 B | Lovable | Banner de alerta blacklist |
| CameraCard.tsx | 5,165 B | Lovable | Card de câmera |
| CameraLayoutControls.tsx | 2,306 B | Lovable | Controles de layout de câmeras |
| CameraMap.tsx | 7,094 B | Lovable | Mapa de câmeras |
| CameraModal.tsx | 10,426 B | Lovable | Modal de detalhes da câmera |
| CameraWithContinuousAnalysis.tsx | 21,864 B | Claude | Câmera com análise contínua |
| ClipGallery.tsx | 24,081 B | Claude | Galeria de clips de vídeo |
| ClipRecorderControls.tsx | 16,604 B | Claude | Controles de gravação |
| ContinuousAnalysisPanel.tsx | 19,769 B | Claude | Painel de análise contínua |
| Dashboard.tsx | 25,529 B | 🔵 Claude | Dashboard principal |
| ErrorBoundary.tsx | 5,718 B | Lovable | Tratamento de erros React |
| EventTimeline.tsx | 4,718 B | Lovable | Timeline de eventos |
| ExportMenu.tsx | 1,284 B | Lovable | Menu de exportação |
| FaceRecognitionOverlay.tsx | 11,682 B | Claude | Overlay de reconhecimento facial |
| FloorPlanMap.tsx | 14,859 B | Lovable | Mapa de planta baixa |
| HLSStreamGrid.tsx | 17,075 B | 🔵 Claude | Grid de streams HLS |
| Header.tsx | 15,202 B | Claude | Cabeçalho principal |
| HeatmapVisualization.tsx | 19,259 B | Lovable | Visualização de mapa de calor |
| HighlightText.tsx | 1,004 B | Lovable | Destaque de texto em buscas |
| KeyboardShortcutsHelp.tsx | 4,431 B | Lovable | Ajuda de atalhos de teclado |
| LicensePlateRecognition.tsx | 19,018 B | Lovable | Reconhecimento de placas |
| LiveFaceRecognition.tsx | 11,664 B | Lovable | Reconhecimento facial ao vivo |
| MultiCameraRecognition.tsx | 23,592 B | Lovable | Reconhecimento multi-câmera |
| NavLink.tsx | 751 B | Lovable | Link de navegação |
| NotificationSecretsConfig.tsx | 23,494 B | 🔵 Claude | Config de secrets de notificação |
| NotificationsPanel.tsx | 11,128 B | Claude | Painel de notificações |
| OnboardingTour.tsx | 9,739 B | Lovable | Tour de onboarding |
| PageSkeletons.tsx | 16,908 B | 🔵 Claude | Skeletons de carregamento |
| PaginationControls.tsx | 6,545 B | Lovable | Controles de paginação |
| PersonCard.tsx | 12,237 B | Claude | Card de pessoa cadastrada |
| PreferencesPanel.tsx | 13,893 B | Lovable | Painel de preferências |
| RecognitionAnalytics.tsx | 18,921 B | Lovable | Analytics de reconhecimento |
| ReportsPanel.tsx | 18,318 B | Lovable | Painel de relatórios |
| RuleCard.tsx | 5,450 B | Lovable | Card de regra |
| RuleEditor.tsx | 16,647 B | Lovable | Editor de regras |
| RulesPanel.tsx | 7,440 B | Lovable | Painel de regras |
| SearchDropdown.tsx | 38,055 B | Lovable | Dropdown de busca avançada |
| SearchInput.tsx | 7,389 B | Lovable | Input de busca |
| Sidebar.tsx | 11,286 B | 🔵 Claude | Sidebar de navegação |
| SoundSettingsPanel.tsx | 10,385 B | Lovable | Configuração de sons |
| StatsCard.tsx | 1,938 B | Lovable | Card de estatísticas |
| StatusIndicator.tsx | 1,047 B | Lovable | Indicador de status |
| StreamConfigPanel.tsx | 22,039 B | Lovable | Configuração de streams |
| StreamingCameraGrid.tsx | 12,571 B | Claude | Grid de câmeras streaming |
| TelegramConfigPanel.tsx | 12,917 B | Lovable | Configuração Telegram |
| TourHighlight.tsx | 1,825 B | 🔵 Claude | Destaque do tour |
| VideoPlayer.tsx | 9,349 B | Lovable | Player de vídeo |
| VideoStreamPlayer.tsx | 21,884 B | Claude | Player de stream HLS |
| WebcamCapture.tsx | 10,621 B | Lovable | Captura de webcam |
| ZoneEditor.tsx | 17,946 B | Claude | Editor de zonas |
| ZoneOverlay.tsx | 12,672 B | Claude | Overlay de zonas |

### Componentes UI - shadcn/ui (49 arquivos - 142.8 KB)

| Componente | Tamanho |
|------------|---------|
| accordion.tsx | 1,976 B |
| alert-dialog.tsx | 4,313 B |
| alert.tsx | 1,546 B |
| aspect-ratio.tsx | 143 B |
| avatar.tsx | 1,365 B |
| badge.tsx | 1,366 B |
| breadcrumb.tsx | 2,687 B |
| button.tsx | 1,840 B |
| calendar.tsx | 2,563 B |
| card.tsx | 1,785 B |
| carousel.tsx | 6,249 B |
| chart.tsx | 9,987 B |
| checkbox.tsx | 1,053 B |
| collapsible.tsx | 320 B |
| command.tsx | 4,821 B |
| context-menu.tsx | 7,191 B |
| dialog.tsx | 3,761 B |
| drawer.tsx | 2,941 B |
| dropdown-menu.tsx | 7,260 B |
| form.tsx | 4,014 B |
| hover-card.tsx | 1,193 B |
| input-otp.tsx | 2,166 B |
| input.tsx | 799 B |
| label.tsx | 696 B |
| menubar.tsx | 7,863 B |
| navigation-menu.tsx | 5,030 B |
| pagination.tsx | 2,683 B |
| popover.tsx | 1,239 B |
| progress.tsx | 765 B |
| radio-group.tsx | 1,447 B |
| resizable.tsx | 1,696 B |
| scroll-area.tsx | 1,608 B |
| select.tsx | 5,575 B |
| separator.tsx | 698 B |
| sheet.tsx | 4,197 B |
| sidebar.tsx | 22,837 B |
| skeleton.tsx | 234 B |
| slider.tsx | 1,065 B |
| sonner.tsx | 879 B |
| switch.tsx | 1,147 B |
| table.tsx | 2,694 B |
| tabs.tsx | 1,897 B |
| textarea.tsx | 751 B |
| toast.tsx | 4,798 B |
| toaster.tsx | 730 B |
| toggle-group.tsx | 1,714 B |
| toggle.tsx | 1,416 B |
| tooltip.tsx | 1,155 B |
| use-toast.ts | 82 B |

---

## 🪝 HOOKS (src/hooks/) - 33 arquivos - 322.2 KB

| Hook | Tamanho | Origem | Funcionalidade |
|------|---------|--------|----------------|
| use-mobile.tsx | 576 B | Lovable | Detectar dispositivo móvel |
| use-toast.ts | 3,935 B | shadcn | Sistema de toasts |
| useAlerts.ts | 5,570 B | Lovable | CRUD de alertas |
| useBlacklistAlerts.ts | 6,627 B | Lovable | Alertas de blacklist |
| useCameras.ts | 3,957 B | Lovable | CRUD de câmeras |
| useClipRecorder.ts | 16,241 B | Claude | Gravação de clips |
| useContinuousAnalysis.ts | 25,848 B | Claude | Análise contínua de IA |
| useContinuousAnalysis.tsx | 12,535 B | Claude | Versão TSX |
| useFaceAPI.ts | 10,892 B | 🔵 Claude | face-api.js integration |
| useFaceDetection.ts | 6,868 B | Lovable | Detecção facial básica |
| useFaceRecognition.ts | 19,034 B | Claude | Reconhecimento facial completo |
| useFaceRecognitionAlerts.ts | 9,799 B | 🔵 Claude | Alertas de reconhecimento |
| useGlobalStreaming.tsx | 14,560 B | 🔵 Claude | Streaming global cross-page |
| useHeatmap.tsx | 12,600 B | 🔵 Claude | Mapa de calor |
| useImageAnalysis.ts | 3,409 B | Lovable | Análise de imagem |
| useKeyboardShortcuts.ts | 9,453 B | Lovable | Atalhos de teclado |
| useMLModels.ts | 10,485 B | 🔵 Claude | TensorFlow.js models |
| useMapboxToken.ts | 924 B | Lovable | Token do Mapbox |
| useMediaMTX.ts | 8,712 B | 🔵 Claude | Gerenciar MediaMTX |
| useNotificationFlow.ts | 10,543 B | 🔵 Claude | Fluxo de notificações |
| useNotifications.ts | 14,097 B | Claude | Push/som notifications |
| useOnboardingTour.ts | 3,235 B | Lovable | Tour de onboarding |
| usePPEDetection.ts | 8,701 B | 🔵 Claude | Detecção de EPIs |
| usePlateDetections.ts | 12,343 B | Lovable | Detecção de placas |
| useRealtimeAlerts.ts | 4,180 B | Lovable | Alertas em tempo real |
| useRealtimeRecognition.ts | 8,882 B | Lovable | Reconhecimento realtime |
| useRuleActions.ts | 8,731 B | 🔵 Claude | Ações de regras |
| useRules.ts | 3,374 B | Lovable | CRUD de regras |
| useSettings.ts | 17,557 B | 🔵 Claude | Configurações centralizadas |
| useStorage.ts | 8,429 B | Lovable | Storage helper |
| useStreamFaceDetection.ts | 10,995 B | Lovable | Face detection em stream |
| useVideoStream.ts | 17,960 B | Claude | Streaming HLS/WebRTC |
| useZoneDetection.ts | 18,873 B | Claude | Detecção em zonas |

---

## 📄 PÁGINAS (src/pages/) - 21 arquivos - 389.2 KB

| Página | Tamanho | Rota | Descrição |
|--------|---------|------|-----------|
| AlertsPage.tsx | 26,993 B | /alerts | Central de alertas |
| AnalyticsPage.tsx | 26,559 B | /analytics | Dashboard analytics |
| Auth.tsx | 11,800 B | /auth | Login/Registro |
| CamerasPage.tsx | 30,245 B | /cameras | Gerenciar câmeras |
| DashboardV2.tsx | 29,767 B | /dashboard | Dashboard principal |
| FaceRecognitionPage.tsx | 11,904 B | /face-recognition | Reconhecimento facial |
| HeatmapPage.tsx | 709 B | /heatmap | Mapa de calor |
| Index.tsx | 2,995 B | / | Redirect para dashboard |
| LicensePlatePage.tsx | 1,608 B | /license-plates | Placas veiculares |
| NotFound.tsx | 727 B | /* | Página 404 |
| NotificationSettingsPage.tsx | 24,901 B | /settings/notifications | Config notificações |
| PeoplePage.tsx | 44,486 B | /people | Cadastro de pessoas |
| RecognitionAnalyticsPage.tsx | 2,447 B | /recognition-analytics | Analytics reconhecimento |
| RecognitionLogsPage.tsx | 25,084 B | /recognition-logs | Logs de reconhecimento |
| RecordingsPage.tsx | 28,782 B | /recordings | Gravações |
| ReportsPage.tsx | 687 B | /reports | Relatórios |
| SecurityPage.tsx | 33,657 B | /security | Segurança e auditoria |
| SettingsPage.tsx | 39,270 B | /settings | Configurações |
| StreamSettingsPage.tsx | 9,315 B | /settings/streams | Config de streams |
| TelegramSettingsPage.tsx | 719 B | /settings/telegram | Config Telegram |
| ZonesPage.tsx | 45,890 B | /zones | Zonas de monitoramento |

---

## 🌐 CONTEXTOS (src/contexts/) - 4 arquivos - 56.7 KB

| Contexto | Tamanho | Origem | Funcionalidade |
|----------|---------|--------|----------------|
| AuthContext.tsx | 2,395 B | Lovable | Autenticação Supabase |
| ThemeProvider.tsx | 10,100 B | Claude | Dark/Light/System theme |
| accessibility.tsx | 15,771 B | 🔵 Claude | ARIA e acessibilidade |
| i18n.tsx | 29,781 B | 🔵 Claude | Internacionalização PT/EN/ES |

---

## 📝 TIPOS (src/types/) - 7 arquivos - 58.5 KB

| Arquivo | Tamanho | Conteúdo |
|---------|---------|----------|
| clips.ts | 10,717 B | Tipos de clips de vídeo |
| continuousAnalysis.ts | 10,633 B | Tipos de análise contínua |
| faceRecognition.ts | 12,890 B | Tipos de reconhecimento facial |
| rules.ts | 3,429 B | Tipos de regras |
| streaming.ts | 8,370 B | Tipos de streaming |
| surveillance.ts | 1,805 B | Tipos gerais de vigilância |
| zones.ts | 12,022 B | Tipos de zonas |

---

## 🗃️ BANCO DE DADOS - SUPABASE

### Tabelas (14 tabelas)

| Tabela | Descrição |
|--------|-----------|
| alerts | Alertas do sistema |
| analysis_history | Histórico de análises |
| cameras | Câmeras cadastradas |
| face_recognition_configs | Config reconhecimento facial |
| notification_configs | Config de notificações |
| plate_detections | Detecções de placas |
| profiles | Perfis de usuários |
| recognition_logs | Logs de reconhecimento |
| registered_persons | Pessoas cadastradas |
| registered_plates | Placas cadastradas |
| rules | Regras de automação |
| video_clips | Clips de vídeo |
| zone_events | Eventos de zonas |
| zones | Zonas de monitoramento |

### Enums

| Enum | Valores |
|------|---------|
| alert_type | security, safety, operations, access, analytics |
| camera_status | online, offline, alert, warning |
| rule_severity | low, medium, high, critical |

### Edge Functions (8 funções)

| Função | Tamanho | Descrição |
|--------|---------|-----------|
| analyze-image/index.ts | 5,330 B | Análise de imagem por IA |
| analyze-license-plate/index.ts | 5,014 B | OCR de placas |
| compare-faces/index.ts | 10,689 B | Comparar rostos |
| detect-faces/index.ts | 5,936 B | Detectar rostos |
| generate-face-encoding/index.ts | 4,181 B | Gerar encoding facial |
| get-mapbox-token/index.ts | 1,120 B | Obter token Mapbox |
| send-alert-notification/index.ts | 9,116 B | Enviar notificações |
| send-telegram/index.ts | 3,064 B | Enviar para Telegram |

### Migrations (17 arquivos - 106.7 KB)

| Migration | Tamanho | Descrição |
|-----------|---------|-----------|
| 00001_consolidated_all_gaps.sql | 23,014 B | Schema consolidado |
| 00002_storage_buckets.sql | 5,230 B | Buckets de storage |
| 00003_notification_config.sql | 9,701 B | Config de notificações |
| 20251219_clips.sql | 10,947 B | Schema de clips |
| 20251219_continuous_analysis.sql | 14,018 B | Schema análise contínua |
| 20251219_facial_recognition.sql | 11,000 B | Schema reconhecimento |
| 20251219_streaming_support.sql | 9,815 B | Schema streaming |
| 20251219_zones.sql | 6,433 B | Schema de zonas |
| + 9 migrations incrementais | ~20 KB | Ajustes diversos |

---

## 🛠️ INTEGRAÇÕES

### Supabase
- **Client:** src/integrations/supabase/client.ts (590 B)
- **Types:** src/integrations/supabase/types.ts (25,642 B)

### Bitrix24
- **Integration:** src/integrations/bitrix24Integration.ts (11,698 B)
- Sincronização de colaboradores
- Integração com CRM

### MediaMTX (Streaming Server)
- **Docker:** docker/docker-compose.mediamtx.yml
- **Config:** docker/mediamtx.yml
- Converte RTSP → HLS/WebRTC

---

## 📚 BIBLIOTECAS PRINCIPAIS (package.json)

### UI/Frontend
- React 18.3.1
- Tailwind CSS 3.4.17
- shadcn/ui (Radix UI)
- Lucide React (ícones)
- Recharts (gráficos)
- date-fns (datas)

### Streaming
- hls.js (HLS playback)
- @tanstack/react-query (cache/fetching)

### IA/ML
- face-api.js (reconhecimento facial)
- @tensorflow/tfjs (ML models)
- @tensorflow-models/coco-ssd (detecção objetos)
- @tensorflow-models/pose-detection (poses)

### Backend
- @supabase/supabase-js (cliente)
- Deno (Edge Functions)

### PDF/Export
- jspdf (geração PDF)
- jspdf-autotable (tabelas PDF)

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### ✅ Completas

1. **Dashboard** - Visão geral do sistema
2. **Gerenciamento de Câmeras** - CRUD completo
3. **Sistema de Alertas** - Com filtros e busca
4. **Reconhecimento Facial** - face-api.js + Supabase
5. **Cadastro de Pessoas** - Com foto e encoding
6. **Zonas de Monitoramento** - Editor visual
7. **Gravação de Clips** - MediaRecorder API
8. **Streaming HLS** - hls.js + MediaMTX
9. **Notificações** - Push, som, Telegram, Webhook
10. **Internacionalização** - PT-BR, EN-US, ES-ES
11. **Tema Escuro/Claro** - Com detecção do sistema
12. **Acessibilidade** - ARIA, skip links, teclado
13. **Analytics** - Gráficos e relatórios
14. **Detecção de Placas** - ALPR básico
15. **Mapa de Calor** - Heatmap de movimento
16. **Detecção de EPIs** - PPE detection hook
17. **ML Models** - TensorFlow.js integration

### 🔄 Parciais

1. **WebRTC** - Hook criado, precisa servidor TURN
2. **Relatórios PDF** - Estrutura pronta, ajustar templates
3. **PWA** - Service worker criado, precisa testar offline

### ❌ Pendentes

1. **Integração câmeras reais RTSP**
2. **Modelo ML de PPE real (não mock)**
3. **Testes automatizados**
4. **CI/CD pipeline**

---

## 📈 MÉTRICAS DO CÓDIGO

| Métrica | Valor |
|---------|-------|
| Total de arquivos TypeScript/TSX | ~200 |
| Linhas de código estimadas | ~50.000 |
| Componentes React | 108 |
| Custom Hooks | 33 |
| Páginas | 21 |
| Tabelas no banco | 14 |
| Edge Functions | 8 |
| Commits totais | ~200 |

---

## 🔗 LINKS

- **Repositório:** https://github.com/adm01-debug/vis-o
- **Lovable Project:** (vinculado ao repositório)
- **Supabase Project:** (configurado via .env)

---

*Documento gerado em 20/12/2025 via análise exaustiva do GitHub API*
