# 🔍 INVENTÁRIO EXAUSTIVO - PROJETO VISÃO

**Data:** 22/12/2024  
**Repositório:** https://github.com/adm01-debug/vis-o  
**Parceria:** Claude + Lovable  

---

## 📊 RESUMO EXECUTIVO

| Métrica | Quantidade |
|---------|------------|
| **Arquivos TypeScript/TSX** | ~300+ |
| **Componentes React** | 138 (89 custom + 49 shadcn/ui) |
| **Hooks** | 59 |
| **Páginas** | 22 |
| **Testes** | 46 (40 hooks + 6 componentes) |
| **Edge Functions** | 9 |
| **Migrations SQL** | 18 |
| **Documentos** | 15 |
| **Libs Utilitárias** | 20 |

---

## 📂 ESTRUTURA RAIZ

```
vis-o/
├── 📂 .github/          # CI/CD, templates
├── 📂 docker/           # Configs Docker/MediaMTX
├── 📂 docs/             # 15 documentos
├── 📂 public/           # Assets estáticos, PWA
├── 📂 src/              # Código fonte principal
├── 📂 supabase/         # Backend (Functions + Migrations)
├── 📄 .env.example      (1.8KB)
├── 📄 .gitignore        (0.9KB)
├── 📄 .lintstagedrc.json (53B)
├── 📄 .prettierrc       (179B)
├── 📄 CHANGELOG.md      (2.6KB)
├── 📄 CONTRIBUTING.md   (4.8KB)
├── 📄 Dockerfile        (1.3KB)
├── 📄 LICENSE           (1.1KB) - MIT
├── 📄 README.md         (10.1KB)
├── 📄 SECURITY.md       (1.2KB)
├── 📄 bun.lockb         (198.7KB)
├── 📄 components.json   (414B) - shadcn config
├── 📄 docker-compose.yml (3.0KB)
├── 📄 eslint.config.js  (765B)
├── 📄 index.html        (2.0KB)
├── 📄 package.json      (3.3KB)
├── 📄 postcss.config.js (81B)
├── 📄 tailwind.config.ts (3.2KB)
├── 📄 tsconfig.*.json   (1.5KB total)
├── 📄 vite.config.ts    (454B)
└── 📄 vitest.config.ts  (794B)
```

---

## 📂 src/ - ESTRUTURA COMPLETA

### src/ (Raiz)
| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| App.tsx | 1.8KB | Componente raiz com providers |
| AppRoutes.tsx | 5.7KB | **22 rotas com lazy loading** ✅ |
| main.tsx | 3.1KB | Entry point + SW registration ✅ |
| App.css | 606B | Estilos globais |
| index.css | 6.5KB | Tailwind + custom CSS |
| vite-env.d.ts | 38B | Tipos Vite |

---

## 📂 src/components/ (138 componentes)

### Componentes Principais (89 arquivos)

#### 🟢 Componentes Grandes (>5KB) - Complexos/Funcionais

| Componente | Tamanho | Origem | Status |
|------------|---------|--------|--------|
| SearchDropdown.tsx | 37.2KB | Lovable | ✅ Usado |
| Dashboard.tsx | 24.9KB | Lovable | ✅ Usado |
| ClipGallery.tsx | 23.5KB | Lovable | ✅ Usado |
| AnalysisHistoryTable.tsx | 23.3KB | Lovable | ✅ Usado |
| MultiCameraRecognition.tsx | 23.0KB | Lovable | ✅ Usado |
| NotificationSecretsConfig.tsx | 22.9KB | Lovable | ✅ Usado |
| CameraWithContinuousAnalysis.tsx | 22.2KB | Lovable | ✅ Usado |
| VideoStreamPlayer.tsx | 22.0KB | Lovable | ✅ Usado |
| StreamConfigPanel.tsx | 21.5KB | Lovable | ✅ Usado |
| ContinuousAnalysisPanel.tsx | 20.0KB | Lovable | ✅ Usado |
| HeatmapVisualization.tsx | 19.7KB | Lovable | ✅ Usado |
| ALPRDashboard.tsx | 18.8KB | Lovable | ✅ Usado |
| HLSStreamGrid.tsx | 18.6KB | Lovable | ✅ Usado |
| LicensePlateRecognition.tsx | 18.6KB | Lovable | ✅ Usado |
| RecognitionAnalytics.tsx | 18.5KB | Lovable | ✅ Usado |
| ReportsPanel.tsx | 17.9KB | Lovable | ✅ Usado |
| ZoneEditor.tsx | 17.5KB | Lovable | ✅ Usado |
| AnalyticsDashboard.tsx | 17.5KB | Lovable | ✅ Usado |
| PageSkeletons.tsx | 16.5KB | Lovable | ✅ Usado |
| RuleEditor.tsx | 16.3KB | Lovable | ✅ Usado |
| ClipRecorderControls.tsx | 16.2KB | Lovable | ✅ Usado |
| Header.tsx | 14.8KB | Lovable | ✅ Usado |
| FloorPlanMap.tsx | 14.5KB | Lovable | ✅ Usado |
| PreferencesPanel.tsx | 13.6KB | Lovable | ✅ Usado |
| TelegramConfigPanel.tsx | 12.6KB | Lovable | ✅ Usado |
| ZoneOverlay.tsx | 12.4KB | Lovable | ✅ Usado |
| StreamingCameraGrid.tsx | 12.3KB | Lovable | ✅ Usado |
| AIAnalysisPanel.tsx | 12.1KB | Lovable | ✅ Usado |
| PersonCard.tsx | 12.0KB | Lovable | ✅ Usado |
| FaceRecognitionOverlay.tsx | 11.4KB | Lovable | ✅ Usado |
| LiveFaceRecognition.tsx | 11.4KB | Lovable | ✅ Usado |
| Sidebar.tsx | 11.2KB | Lovable | ✅ Usado |
| NotificationsPanel.tsx | 10.9KB | Lovable | ✅ Usado |
| WebcamCapture.tsx | 10.4KB | Lovable | ✅ Usado |
| CameraModal.tsx | 10.2KB | Lovable | ✅ Usado |
| SoundSettingsPanel.tsx | 10.1KB | Lovable | ✅ Usado |
| OnboardingTour.tsx | 9.6KB | Lovable | ✅ Usado |
| AlertTrendsChart.tsx | 9.4KB | Lovable | ✅ Usado |
| VideoPlayer.tsx | 9.1KB | Lovable | ✅ Usado |
| BlacklistAlertBanner.tsx | 7.9KB | Lovable | ✅ Usado |
| RulesPanel.tsx | 7.4KB | Lovable | ✅ Usado |
| AlertsByCameraChart.tsx | 7.3KB | Lovable | ✅ Usado |
| SearchInput.tsx | 7.2KB | Lovable | ✅ Usado |
| CameraMap.tsx | 6.9KB | Lovable | ✅ Usado |
| PaginationControls.tsx | 6.4KB | Lovable | ✅ Usado |
| ErrorBoundary.tsx | 5.6KB | Claude | ✅ Usado (App.tsx) |
| RuleCard.tsx | 5.3KB | Lovable | ✅ Usado |
| CameraCard.tsx | 5.0KB | Lovable | ✅ Usado |

#### 🟡 Componentes Médios (1-5KB)

| Componente | Tamanho | Origem | Status |
|------------|---------|--------|--------|
| EventTimeline.tsx | 4.6KB | Lovable | ✅ Usado |
| KeyboardShortcutsHelp.tsx | 4.3KB | Lovable | ✅ Usado |
| AlertCard.tsx | 3.3KB | Lovable | ✅ Usado |
| CameraLayoutControls.tsx | 2.3KB | Lovable | ✅ Usado |
| StatsCard.tsx | 1.9KB | Lovable | ✅ Usado |
| TourHighlight.tsx | 1.8KB | Lovable | ✅ Usado |
| index.ts | 1.4KB | Claude | Barrel export |
| ExportMenu.tsx | 1.3KB | Lovable | ✅ Usado |
| ConfirmDialog.tsx | 1.3KB | Claude | ❌ NÃO USADO |
| StatCard.tsx | 1.2KB | Claude | ❌ NÃO USADO |
| HighlightText.tsx | 1.0KB | Lovable | ✅ Usado |
| StatusIndicator.tsx | 1.0KB | Lovable | ✅ Usado |
| ProtectedRoute.tsx | 1.0KB | Lovable | ✅ Usado |
| StatusBadge.tsx | 1.0KB | Claude | ❌ NÃO USADO |

#### ⚪ Componentes Pequenos (<1KB) - Utilitários

| Componente | Tamanho | Origem | Status |
|------------|---------|--------|--------|
| Breadcrumbs.tsx | 0.9KB | Claude | ❌ NÃO USADO |
| EmptyState.tsx | 0.9KB | Claude | ❌ NÃO USADO |
| ProgressRing.tsx | 0.9KB | Claude | ❌ NÃO USADO |
| LanguageSelector.tsx | 0.8KB | Claude | ✅ Usado |
| FilterDropdown.tsx | 0.8KB | Claude | ❌ NÃO USADO |
| DateRangePicker.tsx | 0.8KB | Claude | ❌ NÃO USADO |
| PageWrapper.tsx | 0.8KB | Claude | ❌ NÃO USADO |
| Pagination.tsx | 0.8KB | Claude | ✅ Usado (5 lugares) |
| ErrorState.tsx | 0.8KB | Claude | ❌ NÃO USADO |
| NavLink.tsx | 0.7KB | Lovable | ✅ Usado |
| NotificationBell.tsx | 0.7KB | Claude | ❌ NÃO USADO |
| SeverityBadge.tsx | 0.7KB | Claude | ❌ NÃO USADO |
| CopyButton.tsx | 0.7KB | Claude | ❌ NÃO USADO |
| CountUp.tsx | 0.7KB | Claude | ❌ NÃO USADO |
| TableSkeleton.tsx | 0.7KB | Claude | ❌ NÃO USADO |
| UserAvatar.tsx | 0.6KB | Claude | ❌ NÃO USADO |
| LoadingSpinner.tsx | 0.6KB | Claude | ❌ NÃO USADO |
| InfoTooltip.tsx | 0.6KB | Claude | ❌ NÃO USADO |
| ThemeToggle.tsx | 0.5KB | Claude | ✅ Usado |
| CardSkeleton.tsx | 0.5KB | Claude | ❌ NÃO USADO |
| TimeAgo.tsx | 0.5KB | Claude | ❌ NÃO USADO |
| PageHeader.tsx | 0.5KB | Claude | ❌ NÃO USADO |
| Divider.tsx | 0.5KB | Claude | ❌ NÃO USADO |
| KeyValue.tsx | 0.4KB | Claude | ❌ NÃO USADO |
| SkipLink.tsx | 0.3KB | Claude | ✅ Usado (App.tsx) |
| VisuallyHidden.tsx | 0.3KB | Claude | ❌ NÃO USADO |

### src/components/ui/ (49 componentes shadcn)

| Componente | Tamanho | Origem |
|------------|---------|--------|
| sidebar.tsx | 22.3KB | shadcn/ui |
| chart.tsx | 9.8KB | shadcn/ui |
| menubar.tsx | 7.7KB | shadcn/ui |
| dropdown-menu.tsx | 7.1KB | shadcn/ui |
| context-menu.tsx | 7.0KB | shadcn/ui |
| carousel.tsx | 6.1KB | shadcn/ui |
| select.tsx | 5.4KB | shadcn/ui |
| navigation-menu.tsx | 4.9KB | shadcn/ui |
| command.tsx | 4.7KB | shadcn/ui |
| toast.tsx | 4.7KB | shadcn/ui |
| alert-dialog.tsx | 4.2KB | shadcn/ui |
| sheet.tsx | 4.1KB | shadcn/ui |
| form.tsx | 3.9KB | shadcn/ui |
| dialog.tsx | 3.7KB | shadcn/ui |
| drawer.tsx | 2.9KB | shadcn/ui |
| breadcrumb.tsx | 2.6KB | shadcn/ui |
| pagination.tsx | 2.6KB | shadcn/ui |
| table.tsx | 2.6KB | shadcn/ui |
| calendar.tsx | 2.5KB | shadcn/ui |
| input-otp.tsx | 2.1KB | shadcn/ui |
| accordion.tsx | 1.9KB | shadcn/ui |
| tabs.tsx | 1.9KB | shadcn/ui |
| button.tsx | 1.8KB | shadcn/ui |
| toggle-group.tsx | 1.7KB | shadcn/ui |
| resizable.tsx | 1.7KB | shadcn/ui |
| card.tsx | 1.7KB | shadcn/ui |
| scroll-area.tsx | 1.6KB | shadcn/ui |
| alert.tsx | 1.5KB | shadcn/ui |
| toggle.tsx | 1.4KB | shadcn/ui |
| radio-group.tsx | 1.4KB | shadcn/ui |
| badge.tsx | 1.3KB | shadcn/ui |
| avatar.tsx | 1.3KB | shadcn/ui |
| hover-card.tsx | 1.2KB | shadcn/ui |
| popover.tsx | 1.2KB | shadcn/ui |
| switch.tsx | 1.1KB | shadcn/ui |
| tooltip.tsx | 1.1KB | shadcn/ui |
| checkbox.tsx | 1.0KB | shadcn/ui |
| slider.tsx | 1.0KB | shadcn/ui |
| sonner.tsx | 0.9KB | shadcn/ui |
| input.tsx | 0.8KB | shadcn/ui |
| label.tsx | 0.7KB | shadcn/ui |
| progress.tsx | 0.7KB | shadcn/ui |
| separator.tsx | 0.7KB | shadcn/ui |
| textarea.tsx | 0.7KB | shadcn/ui |
| toaster.tsx | 0.7KB | shadcn/ui |
| collapsible.tsx | 0.3KB | shadcn/ui |
| skeleton.tsx | 0.2KB | shadcn/ui |
| aspect-ratio.tsx | 0.1KB | shadcn/ui |
| use-toast.ts | 0.1KB | shadcn/ui |

### src/components/__tests__/ (6 testes)

| Teste | Tamanho | Status |
|-------|---------|--------|
| VideoPlayer.test.tsx | 0.4KB | ⚠️ Básico |
| Sidebar.test.tsx | 0.4KB | ⚠️ Básico |
| RulesPanel.test.tsx | 0.3KB | ⚠️ Básico |
| ZoneEditor.test.tsx | 0.2KB | ⚠️ Básico |
| Header.test.tsx | 0.2KB | ⚠️ Básico |
| NotificationsPanel.test.tsx | 0.2KB | ⚠️ Básico |

---

## 📂 src/hooks/ (59 hooks)

### Hooks Principais (Sistema) - Lovable

| Hook | Tamanho | console.log | any types | Status |
|------|---------|-------------|-----------|--------|
| useContinuousAnalysis.ts | 25.2KB | 5 | 0 | ✅ Usado |
| useFaceRecognition.ts | 18.4KB | 4 | 1 | ✅ Usado |
| useZoneDetection.ts | 18.3KB | 6 | 3 | ✅ Usado |
| useSettings.ts | 17.1KB | 7 | 0 | ✅ Usado |
| useVideoStream.ts | 17.4KB | 3 | 0 | ✅ Usado |
| usePPEDetection.ts | 19.3KB | 3 | 1 | ✅ Usado |
| useClipRecorder.ts | 15.9KB | 6 | 0 | ✅ Usado |
| useFaceAPI.ts | 14.6KB | 7 | 4 | ✅ Usado |
| useGlobalStreaming.tsx | 14.2KB | 0 | 0 | ✅ Usado |
| useNotifications.ts | 13.8KB | 11 | 0 | ⚠️ NÃO USADO |
| useMLModels.ts | 13.2KB | 5 | 3 | ✅ Usado |
| useHeatmap.tsx | 12.3KB | 0 | 0 | ✅ Usado |
| usePlateDetections.ts | 11.8KB | 8 | 0 | ⚠️ NÃO USADO |
| useStreamFaceDetection.ts | 10.7KB | 0 | 0 | ✅ Usado |
| useNotificationFlow.ts | 10.3KB | 0 | 0 | ✅ Usado |
| useFaceRecognitionAlerts.ts | 9.6KB | 0 | 0 | ✅ Usado |
| useKeyboardShortcuts.ts | 9.2KB | 1 | 0 | ✅ Usado |
| useRealtimeRecognition.ts | 8.7KB | 0 | 0 | ✅ Usado |
| useMediaMTX.ts | 8.5KB | 0 | 0 | ✅ Usado |
| useRuleActions.ts | 8.5KB | 15 | 0 | ✅ Usado |
| useStorage.ts | 8.2KB | 5 | 0 | ✅ Usado |
| useBlacklistAlerts.ts | 6.5KB | 5 | 0 | ✅ Usado |
| useFaceDetection.ts | 6.1KB | 1 | 3 | ✅ Usado |
| useAlerts.ts | 5.4KB | 2 | 0 | ✅ Usado |
| useCameras.ts | 3.9KB | 2 | 0 | ✅ Usado |
| use-toast.ts | 3.8KB | 0 | 0 | ✅ Usado |
| useCameraSnapshots.ts | 3.8KB | 0 | 0 | ✅ Usado |
| useHeatmapSnapshots.ts | 3.8KB | 0 | 0 | ✅ Usado |
| useRules.ts | 3.3KB | 0 | 0 | ✅ Usado |
| useImageAnalysis.ts | 3.3KB | 0 | 0 | ✅ Usado |
| useOnboardingTour.ts | 3.2KB | 0 | 0 | ✅ Usado |
| useNotificationTemplates.ts | 3.2KB | 0 | 0 | ✅ Usado |
| usePPEConfigs.ts | 3.2KB | 0 | 0 | ✅ Usado |
| useRecordingConfigs.ts | 3.1KB | 0 | 0 | ✅ Usado |
| useRuleViolations.ts | 3.0KB | 0 | 0 | ✅ Usado |
| useAnalysisConfigs.ts | 3.0KB | 0 | 0 | ✅ Usado |
| useRecordingSessions.ts | 3.7KB | 0 | 0 | ✅ Usado |
| useStreamRecordings.ts | 2.6KB | 0 | 0 | ✅ Usado |
| useNotificationHistory.ts | 2.4KB | 0 | 0 | ✅ Usado |
| useRealtimeAlerts.ts | 4.1KB | 0 | 0 | ✅ Usado |

### Hooks Utilitários - Claude (NÃO USADOS)

| Hook | Tamanho | Status |
|------|---------|--------|
| index.ts | 1.5KB | Barrel export |
| useMapboxToken.ts | 0.9KB | ❌ NÃO USADO |
| usePermissions.ts | 0.9KB | ❌ NÃO USADO |
| useLocalStorage.ts | 0.7KB | ❌ NÃO USADO |
| useMediaQuery.ts | 0.7KB | ❌ NÃO USADO |
| useFeatureFlags.ts | 0.7KB | ❌ NÃO USADO |
| use-mobile.tsx | 0.6KB | ✅ Usado |
| useWindowSize.ts | 0.6KB | ❌ NÃO USADO |
| useOnClickOutside.ts | 0.6KB | ❌ NÃO USADO |
| usePerformance.ts | 0.5KB | ❌ NÃO USADO |
| useOnlineStatus.ts | 0.5KB | ❌ NÃO USADO |
| useCopyToClipboard.ts | 0.4KB | ❌ NÃO USADO |
| useInterval.ts | 0.4KB | ❌ NÃO USADO |
| useScrollPosition.ts | 0.4KB | ❌ NÃO USADO |
| useTimeout.ts | 0.4KB | ❌ NÃO USADO |
| useDebounce.ts | 0.3KB | ❌ NÃO USADO |
| useDocumentTitle.ts | 0.3KB | ❌ NÃO USADO |
| useToggle.ts | 0.3KB | ❌ NÃO USADO |
| usePrevious.ts | 0.2KB | ❌ NÃO USADO |

### src/hooks/__tests__/ (40 testes)

#### Testes REAIS (com implementação)

| Teste | Linhas | Status |
|-------|--------|--------|
| useContinuousAnalysis.test.ts | 234 | ✅ Real |
| useVideoStream.test.ts | 212 | ✅ Real |
| usePPEDetection.test.ts | 205 | ✅ Real |
| useFaceAPI.test.ts | 163 | ✅ Real |
| useHeatmap.test.ts | 158 | ✅ Real |
| useZoneDetection.test.ts | 81 | ✅ Real |
| useCameras.test.ts | 81 | ✅ Real |
| useAlerts.test.ts | 79 | ✅ Real |
| usePlateDetections.test.ts | 79 | ✅ Real |
| useRules.test.ts | 78 | ✅ Real |
| useClipRecorder.test.ts | 77 | ✅ Real |
| useFaceRecognition.test.ts | 74 | ✅ Real |
| useSettings.test.ts | 69 | ✅ Real |
| useNotifications.test.ts | 64 | ✅ Real |
| useMLModels.test.ts | 61 | ✅ Real |
| useFaceDetection.test.ts | ~50 | ✅ Real |
| useBlacklistAlerts.test.ts | ~60 | ✅ Real |

#### Testes MOCKS VAZIOS (expect(true).toBe(true))

| Teste | Mocks Vazios | Status |
|-------|--------------|--------|
| useAnalysisConfigs.test.ts | 3 | ❌ Mock vazio |
| useCameraSnapshots.test.ts | 3 | ❌ Mock vazio |
| useFaceRecognitionAlerts.test.ts | 3 | ❌ Mock vazio |
| useHeatmapSnapshots.test.ts | 3 | ❌ Mock vazio |
| useImageAnalysis.test.ts | 3 | ❌ Mock vazio |
| useKeyboardShortcuts.test.ts | 3 | ❌ Mock vazio |
| useMapboxToken.test.ts | 2 | ❌ Mock vazio |
| useMediaMTX.test.ts | 2 | ❌ Mock vazio |
| useNotificationFlow.test.ts | 2 | ❌ Mock vazio |
| useNotificationHistory.test.ts | 2 | ❌ Mock vazio |
| useNotificationTemplates.test.ts | 2 | ❌ Mock vazio |
| useOnboardingTour.test.ts | 2 | ❌ Mock vazio |
| usePPEConfigs.test.ts | 2 | ❌ Mock vazio |
| useRealtimeAlerts.test.ts | 2 | ❌ Mock vazio |
| useRealtimeRecognition.test.ts | 2 | ❌ Mock vazio |
| useRecordingConfigs.test.ts | 2 | ❌ Mock vazio |
| useRecordingSessions.test.ts | 2 | ❌ Mock vazio |
| useRuleActions.test.ts | 2 | ❌ Mock vazio |
| useRuleViolations.test.ts | 1 | ❌ Mock vazio |
| useStorage.test.ts | 1 | ❌ Mock vazio |
| useStreamFaceDetection.test.ts | 1 | ❌ Mock vazio |
| useStreamRecordings.test.ts | 1 | ❌ Mock vazio |
| use-toast.test.ts | 0 | ⚠️ Básico |

---

## 📂 src/pages/ (22 páginas)

| Página | Tamanho | console.log | any types | Origem |
|--------|---------|-------------|-----------|--------|
| ZonesPage.tsx | 45.6KB | 5 | 6 | Lovable |
| PeoplePage.tsx | 43.5KB | 4 | 0 | Lovable |
| SettingsPage.tsx | 38.6KB | 2 | 1 | Lovable |
| SecurityPage.tsx | 32.9KB | 3 | 3 | Lovable |
| CamerasPage.tsx | 30.4KB | 0 | 0 | Lovable |
| DashboardV2.tsx | 29.2KB | 0 | 0 | Lovable |
| RecordingsPage.tsx | 28.6KB | 3 | 0 | Lovable |
| AlertsPage.tsx | 26.7KB | 0 | 3 | Lovable |
| AnalyticsPage.tsx | 26.6KB | 1 | 1 | Lovable |
| RecognitionLogsPage.tsx | 24.6KB | 0 | 0 | Lovable |
| NotificationSettingsPage.tsx | 24.5KB | 3 | 0 | Lovable |
| PPEPage.tsx | 20.9KB | 0 | 1 | Lovable |
| FaceRecognitionPage.tsx | 11.8KB | 0 | 0 | Lovable |
| Auth.tsx | 11.6KB | 0 | 0 | Lovable |
| StreamSettingsPage.tsx | 9.3KB | 1 | 0 | Lovable |
| HeatmapPage.tsx | 6.5KB | 1 | 1 | Lovable |
| Index.tsx | 2.9KB | 0 | 0 | Lovable |
| RecognitionAnalyticsPage.tsx | 2.5KB | 0 | 0 | Lovable |
| LicensePlatePage.tsx | 1.6KB | 0 | 0 | Lovable |
| TelegramSettingsPage.tsx | 0.8KB | 0 | 0 | Lovable |
| ReportsPage.tsx | 0.7KB | 0 | 0 | Lovable |
| NotFound.tsx | 0.7KB | 0 | 0 | Lovable |

---

## 📂 src/lib/ (20 utilities)

| Arquivo | Tamanho | Origem | Usado? |
|---------|---------|--------|--------|
| pdfGenerator.ts | 8.3KB | Lovable | ✅ |
| exportUtils.ts | 7.0KB | Lovable | ✅ |
| alertSounds.ts | 5.3KB | Lovable | ⚠️ |
| browserNotifications.ts | 2.5KB | Lovable | ⚠️ |
| dateUtils.ts | 1.3KB | Claude | ❌ |
| formatters.ts | 0.9KB | Claude | ❌ |
| arrayUtils.ts | 0.8KB | Claude | ❌ |
| logger.ts | 0.8KB | Claude | ❌ |
| eventEmitter.ts | 0.7KB | Claude | ❌ |
| constants.ts | 0.7KB | Claude | ❌ |
| objectUtils.ts | 0.7KB | Claude | ❌ |
| colorUtils.ts | 0.7KB | Claude | ❌ |
| stringUtils.ts | 0.7KB | Claude | ❌ |
| retry.ts | 0.6KB | Claude | ❌ |
| rateLimiter.ts | 0.6KB | Claude | ❌ |
| storage.ts | 0.6KB | Claude | ❌ |
| validators.ts | 0.5KB | Claude | ❌ |
| apiError.ts | 0.5KB | Claude | ❌ |
| index.ts | 0.2KB | Claude | Barrel |
| utils.ts | 0.2KB | Lovable | ✅ |

---

## 📂 src/types/ (9 arquivos)

| Arquivo | Tamanho | Origem |
|---------|---------|--------|
| faceRecognition.ts | 12.6KB | Lovable |
| zones.ts | 11.7KB | Lovable |
| clips.ts | 10.5KB | Lovable |
| continuousAnalysis.ts | 10.4KB | Lovable |
| streaming.ts | 8.2KB | Lovable |
| extended.ts | 3.3KB | Lovable |
| rules.ts | 3.3KB | Lovable |
| surveillance.ts | 1.8KB | Lovable |
| index.ts | 0.6KB | Claude |

---

## 📂 src/contexts/ (4 contextos)

| Arquivo | Tamanho | Origem |
|---------|---------|--------|
| i18n.tsx | 36.2KB | Lovable |
| accessibility.tsx | 15.4KB | Lovable |
| ThemeProvider.tsx | 9.9KB | Lovable |
| AuthContext.tsx | 2.3KB | Lovable |

---

## 📂 src/integrations/ 

| Arquivo | Tamanho | Origem |
|---------|---------|--------|
| supabase/types.ts | 25.0KB | Supabase (gerado) |
| supabase/client.ts | 0.6KB | Lovable |
| bitrix24Integration.ts | ? | Lovable |

---

## 📂 supabase/functions/ (9 Edge Functions)

| Função | Linhas | Importa validation? | USA validateRequest? |
|--------|--------|---------------------|---------------------|
| analyze-image | 182 | ✅ Sim | ❌ NÃO |
| analyze-license-plate | 159 | ✅ Sim | ❌ NÃO |
| compare-faces | 361 | ✅ Sim | ❌ NÃO |
| detect-faces | 188 | ✅ Sim | ❌ NÃO |
| generate-face-encoding | 133 | ✅ Sim | ❌ NÃO |
| send-alert-notification | 246 | ✅ Sim | ❌ NÃO |
| send-telegram | 97 | ✅ Sim | ❌ NÃO |
| get-mapbox-token | ? | ❌ Não | ❌ NÃO |
| _shared/validation.ts | 81 | - | - |

**⚠️ PROBLEMA:** Todas as Edge Functions importam validation.ts mas NÃO usam as funções!

---

## 📂 supabase/migrations/ (18 migrations)

| Migration | Tamanho | Tabelas | Índices | RLS |
|-----------|---------|---------|---------|-----|
| 00001_consolidated_all_gaps.sql | 22.5KB | 10 | 22 | 10 |
| 20251219_clips.sql | 10.7KB | 3 | 9 | 6 |
| 20251219_facial_recognition.sql | 10.7KB | 3 | 12 | 6 |
| 20251219_continuous_analysis.sql | 13.7KB | ? | ? | ? |
| 20251219_streaming_support.sql | 9.6KB | ? | ? | ? |
| 00003_notification_config.sql | 9.5KB | ? | ? | ? |
| 20251220_ppe_heatmap_tables.sql | 8.3KB | ? | ? | ? |
| 20251219_zones.sql | 6.3KB | 2 | 7 | 4 |
| 20251220111343_*.sql | 5.5KB | ? | ? | ? |
| 00002_storage_buckets.sql | 5.1KB | 0 | 0 | ? |
| + 8 migrations menores | ~12KB | - | - | - |

**✅ BOM:** Migrations têm índices e RLS policies!

---

## 📂 docs/ (15 documentos)

| Documento | Tamanho | Origem |
|-----------|---------|--------|
| INVENTARIO_EXAUSTIVO_PROJETO.md | 22.2KB | Claude |
| INVENTARIO_COMPLETO.md | 17.9KB | Claude |
| AUDITORIA_EXAUSTIVA_2024-12-21.md | 11.6KB | Claude |
| DEPLOY_GUIDE.md | 8.5KB | Lovable |
| MELHORIAS_PENDENTES_REAIS.md | 6.7KB | Claude |
| AUDITORIA_MELHORIAS_2024-12-21.md | 5.6KB | Claude |
| MEDIAMTX_SETUP.md | 5.3KB | Lovable |
| API.md | 5.2KB | Claude |
| MELHORIAS_PENDENTES.md | 4.7KB | Claude |
| DEPLOYMENT.md | 4.1KB | Claude |
| ARCHITECTURE.md | 3.4KB | Claude |
| MELHORIAS_CONCLUIDAS.md | 2.1KB | Claude |
| DATABASE.md | 2.0KB | Claude |
| HOOKS.md | 1.3KB | Claude |
| COMPONENTS.md | 0.9KB | Claude |

---

## 📂 public/ (Assets)

```
public/
├── 📄 favicon.ico (19.9KB) ✅
├── 📄 manifest.json (2.5KB) ✅
├── 📄 placeholder.svg (3.2KB)
├── 📄 robots.txt (0.2KB)
├── 📄 service-worker.ts (11.2KB)
├── 📄 sw.js (0.6KB)
├── 📂 icons/ (11 arquivos PWA)
│   ├── icon-72x72.png (3.7KB)
│   ├── icon-96x96.png (4.9KB)
│   ├── icon-128x128.png (6.7KB)
│   ├── icon-144x144.png (8.3KB)
│   ├── icon-152x152.png (9.0KB)
│   ├── icon-192x192.png (11.5KB)
│   ├── icon-384x384.png (28.0KB)
│   ├── icon-512x512.png (32.2KB)
│   ├── apple-touch-icon.png (10.7KB)
│   ├── maskable-icon.png (19.2KB)
│   └── README.md (2.1KB)
├── 📂 models/ (1 arquivo)
│   └── README.md (2.2KB)
└── 📂 sounds/ (?)
```

---

## 📂 .github/ (CI/CD)

```
.github/
├── 📄 CODEOWNERS
├── 📄 PULL_REQUEST_TEMPLATE.md
├── 📄 dependabot.yml
├── 📂 ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── 📂 workflows/
    └── deploy.yml
```

---

## 📂 docker/ (Infraestrutura)

| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| mediamtx.yml | 6.0KB | Config do MediaMTX |
| nginx.conf | 1.3KB | Proxy reverso |
| docker-compose.mediamtx.yml | 1.2KB | Compose MediaMTX |

---

## 🔍 ANÁLISE DETALHADA DE PROBLEMAS

### Console.log por Arquivo (Total: ~100+)

| Arquivo | Quantidade |
|---------|------------|
| useRuleActions.ts | 15 |
| useNotifications.ts | 11 |
| usePlateDetections.ts | 8 |
| SearchDropdown.tsx | 8 |
| useSettings.ts | 7 |
| useFaceAPI.ts | 7 |
| useZoneDetection.ts | 6 |
| useClipRecorder.ts | 6 |
| useMLModels.ts | 5 |
| useStorage.ts | 5 |
| useContinuousAnalysis.ts | 5 |
| useBlacklistAlerts.ts | 5 |
| ZonesPage.tsx | 5 |
| useFaceRecognition.ts | 4 |
| PeoplePage.tsx | 4 |
| useVideoStream.ts | 3 |
| usePPEDetection.ts | 3 |
| SecurityPage.tsx | 3 |
| RecordingsPage.tsx | 3 |
| NotificationSettingsPage.tsx | 3 |
| MultiCameraRecognition.tsx | 2 |
| useCameras.ts | 2 |
| useAlerts.ts | 2 |
| SettingsPage.tsx | 2 |
| + outros | ~20 |

### Tipos 'any' por Arquivo (Total: ~30)

| Arquivo | Quantidade |
|---------|------------|
| ZonesPage.tsx | 6 |
| useFaceAPI.ts | 4 |
| useZoneDetection.ts | 3 |
| useMLModels.ts | 3 |
| useFaceDetection.ts | 3 |
| AnalysisHistoryTable.tsx | 3 |
| SecurityPage.tsx | 3 |
| AlertsPage.tsx | 3 |
| CameraWithContinuousAnalysis.tsx | 2 |
| MultiCameraRecognition.tsx | 1 |
| Header.tsx | 1 |
| Sidebar.tsx | 1 |
| usePPEDetection.ts | 1 |
| useFaceRecognition.ts | 1 |
| SettingsPage.tsx | 1 |
| PPEPage.tsx | 1 |
| HeatmapPage.tsx | 1 |
| AnalyticsPage.tsx | 1 |

---

## 📊 RESUMO: LOVABLE vs CLAUDE

### Arquivos Criados pelo Lovable (~85%)

- **89 componentes** (maioria funcional)
- **~40 hooks** (sistema principal)
- **22 páginas** (todas)
- **4 contextos** (todos)
- **9 Edge Functions** (todas)
- **18 migrations** (todas)
- **Tipos gerados** (Supabase)
- **49 componentes UI** (shadcn)
- **Configs principais** (vite, tailwind, etc)

### Arquivos Criados pelo Claude (~15%)

- **~20 componentes utilitários** (maioria NÃO usada)
- **~16 hooks utilitários** (NENHUM usado)
- **~14 libs utilitárias** (NENHUMA usada)
- **15 documentos**
- **Barrel exports** (index.ts)
- **Configs DevOps** (.github, .prettierrc, etc)
- **validation.ts** (importada mas NÃO usada)

---

## 🎯 CONCLUSÕES

### ✅ O que FUNCIONA (Lovable)

1. **Sistema core completo** - 22 páginas funcionais
2. **Componentes complexos** - Dashboard, VideoPlayer, etc
3. **Hooks principais** - useCameras, useAlerts, useFaceRecognition
4. **Banco de dados** - 18 migrations com índices e RLS
5. **PWA** - Manifest, ícones, SW (registrado em main.tsx)
6. **Lazy loading** - 22 rotas com React.lazy
7. **i18n** - Sistema de internacionalização
8. **Auth** - Sistema de autenticação
9. **Theme** - Dark/Light mode
10. **Accessibility context** - Existe mas não integrado

### ⚠️ O que NÃO está integrado (Claude)

1. **14 componentes utilitários** - Criados mas nunca importados
2. **16 hooks utilitários** - Criados mas nunca usados
3. **14 libs utilitárias** - Criadas mas nunca importadas
4. **validation.ts** - Importada nas Edge Functions mas funções não chamadas
5. **22 testes** - São mocks vazios (expect(true).toBe(true))

### ❌ O que precisa ser corrigido

1. **~100 console.log** em produção
2. **~30 tipos 'any'** não tipados
3. **0 aria-labels** em páginas
4. **0 React.memo** em componentes pesados
5. **Edge Functions** não usam validação
6. **id='main-content'** não existe para SkipLink

---

## 📈 MÉTRICAS FINAIS

| Categoria | Lovable | Claude | Total |
|-----------|---------|--------|-------|
| Componentes | 89 | 20 | 109 |
| Hooks | 43 | 16 | 59 |
| Páginas | 22 | 0 | 22 |
| Libs | 6 | 14 | 20 |
| Testes Reais | 0 | 17 | 17 |
| Testes Mock | 0 | 22 | 22 |
| Docs | 2 | 13 | 15 |

### Status Real

- **Código Funcional:** ~85% (Lovable)
- **Código Não Integrado:** ~15% (Claude)
- **Console.log:** 100+ para remover
- **Tipos any:** ~30 para tipar
- **Testes:** 17 reais, 22 mocks vazios
- **Acessibilidade:** 0%
- **React.memo:** 0%

---

*Inventário gerado em 22/12/2024 via análise exaustiva do GitHub API*
