# Dependency Audit Report

**Projeto:** VISÃO  
**Gerado em:** 2026-04-22T18:10:50.137Z  
**Fonte:** `reports/deadcode/raw.json` (knip)  
**Total de achados:** 762

> ⚠️ **Importante:** este relatório é uma heurística. Antes de remover qualquer item marcado como `🔴 alto` ou `🟡 médio`, verifique manualmente se há referências por:
> - lazy imports (`React.lazy`, `import()` dinâmico)
> - strings dinâmicas (rotas em `App.tsx`, registros de plugins)
> - consumo externo (Storybook, Edge Functions, scripts de build)
> - re-exports via barrels (`index.ts`)

## Resumo executivo

| Categoria | Total | 🔴 alto | 🟡 médio | 🟢 baixo |
|-----------|------:|--------:|---------:|---------:|
| Arquivos órfãos | 232 | 84 | 89 | 59 |
| Exports não usados | 233 | 100 | 133 | 0 |
| Tipos não usados | 171 | 1 | 159 | 11 |
| Dependências mortas | 33 | 16 | 9 | 8 |
| DevDependencies mortas | 2 | 0 | 0 | 2 |
| Exports duplicados | 84 | — | — | — |
| Imports não declarados | 4 | — | — | — |
| Imports não resolvidos | 3 | — | — | — |

## Legenda de risco

- 🔴 alto — Revisar manualmente; pode estar em uso por lazy import, string dinâmica ou build externo.
- 🟡 médio — Verificar referências antes de remover; provável seguro após inspeção.
- 🟢 baixo — Remoção segura na maioria dos casos.

## Arquivos órfãos

### 🔴 alto — 84 item(ns)

> Revisar manualmente; pode estar em uso por lazy import, string dinâmica ou build externo.

- `src/config/api.ts`
- `src/config/env.ts`
- `src/config/features.ts`
- `src/config/index.ts`
- `src/config/ipWhitelist.ts`
- `src/config/lazyRoutes.ts`
- `src/config/locale.ts`
- `src/config/models_config.ts`
- `src/config/routes.ts`
- `src/config/sentry.ts`
- `src/config/supabase.ts`
- `src/config/theme.ts`
- `src/contexts/AnalyticsContext.tsx`
- `src/contexts/CameraContext.tsx`
- `src/contexts/SettingsContext.tsx`
- `src/contexts/UserContext.tsx`
- `src/contexts/accessibility.tsx`
- `src/contexts/index.tsx`
- `src/hooks/useAnalytics.ts`
- `src/hooks/useAsync.ts`
- `src/hooks/useCamera.ts`
- `src/hooks/useClickAway.ts`
- `src/hooks/useClipboard.ts`
- `src/hooks/useCopyToClipboard.ts`
- `src/hooks/useCountdown.ts`
- `src/hooks/useDebounce.ts`
- `src/hooks/useDisclosure.ts`
- `src/hooks/useEventListener.ts`
- `src/hooks/useFaceRecognition.ts`
- `src/hooks/useFetch.ts`
- `src/hooks/useFilter.ts`
- `src/hooks/useFocus.ts`
- `src/hooks/useForm.ts`
- `src/hooks/useFullscreen.ts`
- `src/hooks/useHover.ts`
- `src/hooks/useInfiniteScroll.ts`
- `src/hooks/useInterval.ts`
- `src/hooks/useKeyboardShortcut.ts`
- `src/hooks/useKeyboardShortcuts.ts`
- `src/hooks/useLatest.ts`
- `src/hooks/useLocalStorage.ts`
- `src/hooks/useLockBodyScroll.ts`
- `src/hooks/useLongPress.ts`
- `src/hooks/useMap.ts`
- `src/hooks/useMediaQuery.ts`
- `src/hooks/useMount.ts`
- `src/hooks/useMounted.ts`
- `src/hooks/useNetworkState.ts`
- `src/hooks/useOffline.ts`
- `src/hooks/useOnScreen.ts`
- `src/hooks/usePagination.ts`
- `src/hooks/usePerformance.ts`
- `src/hooks/usePrevious.ts`
- `src/hooks/useQueue.ts`
- `src/hooks/useRecording.ts`
- `src/hooks/useScript.ts`
- `src/hooks/useScrollPosition.ts`
- `src/hooks/useSet.ts`
- `src/hooks/useSettings.ts`
- `src/hooks/useSpeechRecognition.ts`
- `src/hooks/useSpeechSynthesis.ts`
- `src/hooks/useThrottle.ts`
- `src/hooks/useTimeout.ts`
- `src/hooks/useTitle.ts`
- `src/hooks/useToggle.ts`
- `src/hooks/useWindowSize.ts`
- `src/integrations/index.ts`
- `src/layouts/AuthLayout.tsx`
- `src/layouts/DashboardLayout.tsx`
- `src/layouts/ErrorLayout.tsx`
- `src/layouts/MainLayout.tsx`
- `src/layouts/MinimalLayout.tsx`
- `src/layouts/index.tsx`
- `src/providers/AnalyticsProvider.tsx`
- `src/providers/AppProviders.tsx`
- `src/providers/ModalProvider.tsx`
- `src/providers/QueryProvider.tsx`
- `src/providers/ToastProvider.tsx`
- `src/providers/index.tsx`
- `src/contexts/a11y/components.tsx`
- _…e mais 4 (ver `summary.md`/`raw.json`)._

### 🟡 médio — 89 item(ns)

> Verificar referências antes de remover; provável seguro após inspeção.

- `src/components/AccessDenied.tsx`
- `src/components/AlertDetail.tsx`
- `src/components/AlertNotification.tsx`
- `src/components/AuthCallback.tsx`
- `src/components/CameraCard.tsx`
- `src/components/CameraGrid.tsx`
- `src/components/CameraLayoutControls.tsx`
- `src/components/Dashboard.tsx`
- `src/components/DataTable.tsx`
- `src/components/DateRangePicker.tsx`
- `src/components/DetectionOverlay.tsx`
- `src/components/Divider.tsx`
- `src/components/Dock.tsx`
- `src/components/ErrorFallback.tsx`
- `src/components/ErrorState.tsx`
- `src/components/FloatingAction.tsx`
- `src/components/FocusTrap.tsx`
- `src/components/Gauge.tsx`
- `src/components/GlobalSearch.tsx`
- `src/components/Head.tsx`
- `src/components/ImageAnalysis.tsx`
- `src/components/KeyboardShortcuts.tsx`
- `src/components/LazyComponent.tsx`
- `src/components/LazyImage.tsx`
- `src/components/LazyLoad.tsx`
- `src/components/LiveRegion.tsx`
- `src/components/LoadingOverlay.tsx`
- `src/components/Meta.tsx`
- `src/components/NavLink.tsx`
- `src/components/NotificationConfig.tsx`
- `src/components/NotificationSettings.tsx`
- `src/components/PageHeader.tsx`
- `src/components/Pagination.tsx`
- `src/components/PersonCard.tsx`
- `src/components/PersonForm.tsx`
- `src/components/RecognitionLogs.tsx`
- `src/components/RuleCard.tsx`
- `src/components/RuleEditor.tsx`
- `src/components/SectionErrorBoundary.tsx`
- `src/components/SecuritySettings.tsx`
- `src/components/Spotlight.tsx`
- `src/components/StatCard.tsx`
- `src/components/StatusBadge.tsx`
- `src/components/StreamPlayer.tsx`
- `src/components/TableSkeleton.tsx`
- `src/components/TelegramConfig.tsx`
- `src/components/TelegramSettings.tsx`
- `src/components/TimeAgo.tsx`
- `src/components/Timeline.tsx`
- `src/components/Tooltip.tsx`
- `src/components/Tour.tsx`
- `src/components/TourHighlight.tsx`
- `src/components/VisuallyHidden.tsx`
- `src/pages/index.ts`
- `src/components/analysis/StatCard.tsx`
- `src/components/analytics/analyticsConstants.ts`
- `src/components/clips/ClipCard.tsx`
- `src/components/clips/clipConstants.ts`
- `src/components/dashboard/DashboardAlerts.tsx`
- `src/components/dashboard/DashboardCameraGrid.tsx`
- `src/components/dashboard/DashboardControlsBar.tsx`
- `src/components/dashboard/DashboardSkeleton.tsx`
- `src/components/dashboard/DashboardStats.tsx`
- `src/components/dashboard/StreamCameraCard.tsx`
- `src/components/dashboard/index.ts`
- `src/components/dashboard/types.ts`
- `src/components/notifications/notificationHelpers.ts`
- `src/components/person-card/PersonCardCompact.tsx`
- `src/components/rule-editor/ConditionsSection.tsx`
- `src/components/rule-editor/RuleEditorConstants.ts`
- `src/components/rule-editor/ScheduleSection.tsx`
- `src/components/scanner/DetectedRisksCard.tsx`
- `src/components/search/searchHelpers.tsx`
- `src/components/settings/index.ts`
- `src/components/sidebar/index.ts`
- `src/components/skeleton/SkeletonLoader.tsx`
- `src/components/skeleton/index.ts`
- `src/components/tabs/Tabs.tsx`
- `src/components/tabs/index.ts`
- `src/components/switch/Switch.tsx`
- _…e mais 9 (ver `summary.md`/`raw.json`)._

### 🟢 baixo — 59 item(ns)

> Remoção segura na maioria dos casos.

- `src/constants/animations.ts`
- `src/constants/api.ts`
- `src/constants/breakpoints.ts`
- `src/constants/colors.ts`
- `src/constants/endpoints.ts`
- `src/constants/errors.ts`
- `src/constants/events.ts`
- `src/constants/features.ts`
- `src/constants/index.ts`
- `src/constants/keybindings.ts`
- `src/constants/keys.ts`
- `src/constants/messages.ts`
- `src/constants/permissions.ts`
- `src/constants/regex.ts`
- `src/constants/roles.ts`
- `src/constants/routes.ts`
- `src/constants/status.ts`
- `src/constants/transitions.ts`
- `src/constants/validation.ts`
- `src/constants/zIndex.ts`
- `src/data/index.ts`
- `src/data/mockRules.ts`
- `src/hooks/index.ts`
- `src/hooks/use-mobile.tsx`
- `src/middleware/errorHandler.ts`
- `src/middleware/index.ts`
- `src/middleware/ipWhitelist.ts`
- `src/middleware/logging.ts`
- `src/middleware/validation.ts`
- `src/stores/aiStore.ts`
- `src/stores/alertStore.ts`
- `src/stores/analyticsStore.ts`
- `src/stores/appStore.ts`
- `src/stores/authStore.ts`
- `src/stores/cameraStore.ts`
- `src/stores/filterStore.ts`
- `src/stores/index.ts`
- `src/stores/integrationStore.ts`
- `src/stores/mediaStore.ts`
- `src/stores/notificationStore.ts`
- `src/stores/playbackStore.ts`
- `src/stores/recordingStore.ts`
- `src/stores/settingsStore.ts`
- `src/stores/syncStore.ts`
- `src/stores/themeStore.ts`
- `src/stores/uiStore.ts`
- `src/stores/userStore.ts`
- `src/i18n/index.ts`
- `src/types/clips.ts`
- `src/types/faceRecognition.ts`
- `src/types/index.ts`
- `src/utils/index.ts`
- `src/hooks/clip-recorder/types.ts`
- `src/hooks/clip-recorder/useClipStorage.ts`
- `src/hooks/global-streaming/streamingTypes.ts`
- `src/hooks/settings/types.ts`
- `src/types/faceRecognition/helpers.ts`
- `src/types/faceRecognition/index.ts`
- `src/types/faceRecognition/types.ts`

## Exports não utilizados

### 🔴 alto — 100 item(ns)

> Revisar manualmente; pode estar em uso por lazy import, string dinâmica ou build externo.

- `src/components/settings/NotificationSettingsPanel.tsx:223` — `default`
- `src/components/skeletons/FiltersBarSkeleton.tsx:55` — `default`
- `src/components/skeletons/TabsSkeleton.tsx:29` — `default`
- `src/components/skeletons/SkeletonErrorBoundary.tsx:113` — `default`
- `src/components/dev/SkeletonToggleButton.tsx:44` — `default`
- `src/components/dev/SkeletonFailureToggleButton.tsx:75` — `default`
- `src/components/dev/MobileMenuChecklist.tsx:229` — `default`
- `src/components/ErrorBoundary.tsx:197` — `default`
- `src/components/LoadingSpinner.tsx:65` — `default`
- `src/components/layout/MainLayout.tsx:146` — `default`
- `src/components/ProtectedRoute.tsx:46` — `default`
- `src/components/PanicButton.tsx:76` — `default`
- `src/components/debug/CLSBadge.tsx:97` — `default`
- `src/components/debug/CLSShiftOverlay.tsx:155` — `default`
- `src/components/AnalysisHistoryPanel.tsx:141` — `default`
- `src/components/ArmDisarmControl.tsx:83` — `default`
- `src/components/AutomationRulesManager.tsx:134` — `default`
- `src/components/BottomNavigation.tsx:148` — `default`
- `src/components/Breadcrumbs.tsx:211` — `default`
- `src/components/ClipRecorderControls.tsx:138` — `default`
- `src/components/EmptyState.tsx:80` — `default`
- `src/components/FaceRecognitionOverlay.tsx:105` — `default`
- `src/components/UserAvatar.tsx:22` — `default`
- `src/components/NotificationBell.tsx:20` — `default`
- `src/components/Header.tsx:100` — `default`
- `src/components/HeatmapVisualization.tsx:178` — `default`
- `src/components/LicensePlateRecognition.tsx:119` — `default`
- `src/components/LiveFaceRecognition.tsx:113` — `default`
- `src/components/OfflineIndicator.tsx:259` — `default`
- `src/components/OnboardingTour.tsx:63` — `default`
- `src/components/PWAMigrationBanner.tsx:115` — `default`
- `src/components/PageSkeletons.tsx:83` — `default`
- `src/components/ReportsPanel.tsx:111` — `default`
- `src/components/SeverityBadge.tsx:24` — `default`
- `src/components/ShortcutsHelpDialog.tsx:76` — `default`
- `src/components/sidebar/components/index.ts:5` — `SidebarHeader`
- `src/components/sidebar/components/index.ts:6` — `SidebarNav`
- `src/components/sidebar/components/index.ts:7` — `SidebarFooter`
- `src/components/sidebar/components/index.ts:10` — `AnimatedCategoryIcon`
- `src/components/sidebar/components/index.ts:11` — `CategoryStatusIndicator`
- `src/components/sidebar/components/index.ts:12` — `SearchTrigger`
- `src/components/Sidebar.tsx:43` — `default`
- `src/components/StreamConfigPanel.tsx:107` — `default`
- `src/components/TelegramConfigPanel.tsx:123` — `default`
- `src/components/VideoStreamPlayer.tsx:318` — `default`
- `src/components/ZoneEditor.tsx:146` — `default`
- `src/components/ZoneOverlay.tsx:124` — `default`
- `src/components/common/index.ts:6` — `PageHeader`
- `src/components/common/index.ts:7` — `SearchInput`
- `src/components/common/index.ts:8` — `StatusBadge`
- `src/components/common/index.ts:9` — `DataCard`
- `src/components/common/index.ts:10` — `Avatar`
- `src/components/common/index.ts:11` — `Badge`
- `src/components/common/index.ts:12` — `Tooltip`
- `src/components/common/index.ts:13` — `Divider`
- `src/components/common/index.ts:14` — `Text`
- `src/components/common/index.ts:15` — `Heading`
- `src/components/common/index.ts:16` — `SkipLink`
- `src/components/common/index.ts:17` — `LoadingSpinner`
- `src/components/common/index.ts:19` — `ErrorState`
- `src/components/timeago/index.ts:1` — `TimeAgo`
- `src/components/layout/index.ts:6` — `MainLayout`
- `src/components/layout/index.ts:6` — `PageContent`
- `src/components/index.ts:7` — `Avatar`
- `src/components/index.ts:7` — `Badge`
- `src/components/index.ts:7` — `DataCard`
- `src/components/index.ts:7` — `Divider`
- `src/components/index.ts:7` — `ErrorState`
- `src/components/index.ts:7` — `Heading`
- `src/components/index.ts:7` — `LoadingSpinner`
- `src/components/index.ts:7` — `PageHeader`
- `src/components/index.ts:7` — `SearchInput`
- `src/components/index.ts:7` — `SkipLink`
- `src/components/index.ts:7` — `StatusBadge`
- `src/components/index.ts:7` — `Text`
- `src/components/index.ts:7` — `Tooltip`
- `src/components/index.ts:10` — `TimeAgo`
- `src/components/index.ts:13` — `ErrorBoundary`
- `src/components/index.ts:16` — `MainLayout`
- `src/components/index.ts:16` — `PageContent`
- _…e mais 20 (ver `summary.md`/`raw.json`)._

### 🟡 médio — 133 item(ns)

> Verificar referências antes de remover; provável seguro após inspeção.

- `src/components/widgets/EnhancedWidgetWrapper.tsx:22` — `EnhancedWidgetWrapper`
- `src/components/cameras/EnhancedCameraGrid.tsx:63` — `EnhancedCameraCard`
- `src/components/cameras/EnhancedCameraGrid.tsx:263` — `CameraGrid`
- `src/components/widgets/EnhancedWidgets.tsx:4` — `EnhancedWidgetWrapper`
- `src/components/widgets/EnhancedWidgets.tsx:5` — `WidgetGrid`
- `src/components/widgets/EnhancedWidgets.tsx:6` — `StatCard`
- `src/components/widgets/EnhancedWidgets.tsx:7` — `MiniChart`
- `src/lib/alertSounds.ts:79` — `updateSoundSettings`
- `src/lib/dateUtils.ts:51` — `getTimeAgo`
- `src/lib/dateUtils.ts:52` — `getRelativeTime`
- `src/lib/errorTracking.ts:20` — `default`
- `src/lib/ipUtils.ts:80` — `getClientIP`
- `src/lib/logger.ts:142` — `default`
- `src/lib/lazyLoad.tsx:14` — `LoadingFallback`
- `src/lib/lazyLoad.tsx:23` — `PageLoadingFallback`
- `src/lib/lazyLoad.tsx:88` — `LazyPages`
- `src/lib/lazyLoad.tsx:97` — `default`
- `src/contexts/ThemeContext.tsx:10` — `useTheme`
- `src/contexts/ThemeContext.tsx:14` — `toggleTheme`
- `src/components/ErrorBoundary.tsx:140` — `withErrorBoundary`
- `src/components/ErrorBoundary.tsx:161` — `ErrorBoundaryWrapper`
- `src/components/LoadingSpinner.tsx:14` — `LoadingSpinner`
- `src/components/RouteErrorBoundary.tsx:18` — `RouteErrorBoundary`
- `src/lib/errorReporter.ts:178` — `default`
- `src/pages/DashboardV2.tsx:50` — `DashboardV2`
- `src/pages/CamerasPage.tsx:29` — `CamerasPage`
- `src/pages/AlertsPage.tsx:30` — `AlertsPage`
- `src/pages/ZonesPage.tsx:27` — `ZonesPage`
- `src/pages/RecordingsPage.tsx:30` — `RecordingsPage`
- `src/pages/AnalyticsPage.tsx:34` — `AnalyticsPage`
- `src/pages/SettingsPage.tsx:25` — `SettingsPage`
- `src/pages/SecurityPage.tsx:22` — `SecurityPage`
- `src/lib/clsMonitor.ts:290` — `getAllReports`
- `src/components/alerts/alertFilterTypes.ts:49` — `SEVERITY_LABELS`
- `src/components/AlertFilters.tsx:33` — `AlertFiltersComponent`
- `src/hooks/useImageAnalysis.ts:58` — `useImageAnalysis`
- `src/types/rules.ts:54` — `mapDbRuleToUI`
- `src/types/rules.ts:77` — `mapUIRuleToDb`
- `src/components/ConfirmDialog.tsx:24` — `ConfirmDialog`
- `src/components/FaceRecognitionOverlay.tsx:94` — `useFaceDetectionAnimation`
- `src/hooks/useOnlineStatus.ts:20` — `default`
- `src/hooks/useHeatmap.tsx:218` — `default`
- `src/components/heatmap/HeatmapMatrixTab.tsx:76` — `getHeatClass`
- `src/hooks/useNotifications.ts:113` — `default`
- `src/hooks/use-toast.ts:71` — `reducer`
- `src/hooks/useOfflineSync.ts:353` — `default`
- `src/hooks/useOnboardingTour.ts:131` — `default`
- `src/components/OnboardingTour.tsx:58` — `RestartTourButton`
- `src/constants/app.ts:2` — `APP_NAME`
- `src/constants/app.ts:3` — `APP_VERSION`
- `src/constants/app.ts:4` — `API_TIMEOUT`
- `src/constants/app.ts:5` — `REFRESH_INTERVAL`
- `src/constants/app.ts:6` — `MAX_CAMERAS`
- `src/constants/app.ts:7` — `MAX_ZONES`
- `src/constants/app.ts:8` — `MAX_RULES`
- `src/constants/app.ts:9` — `SUPPORTED_LANGUAGES`
- `src/constants/app.ts:10` — `DEFAULT_LANGUAGE`
- `src/components/PageSkeletons.tsx:8` — `DashboardSkeleton`
- `src/components/PageSkeletons.tsx:9` — `CamerasSkeleton`
- `src/components/PageSkeletons.tsx:10` — `AlertsSkeleton`
- `src/components/PageSkeletons.tsx:11` — `PeopleSkeleton`
- `src/components/PageSkeletons.tsx:12` — `ZonesSkeleton`
- `src/components/PageSkeletons.tsx:13` — `RecordingsSkeleton`
- `src/components/PageSkeletons.tsx:14` — `AnalyticsSkeleton`
- `src/components/PageSkeletons.tsx:15` — `SecuritySkeleton`
- `src/components/PageSkeletons.tsx:16` — `SettingsSkeleton`
- `src/components/PageSkeletons.tsx:28` — `CardSkeleton`
- `src/components/PageSkeletons.tsx:41` — `TableSkeleton`
- `src/components/PageSkeletons.tsx:67` — `PageSkeleton`
- `src/lib/pdfGenerator.ts:303` — `captureElementToPDF`
- `src/components/SearchInput.tsx:197` — `searchInText`
- `src/components/SeverityBadge.tsx:18` — `SeverityBadge`
- `src/hooks/useVideoStream.ts:217` — `default`
- `src/hooks/useMLModels.ts:234` — `useContinuousDetection`
- `src/hooks/useMLModels.ts:260` — `default`
- `src/hooks/useStreamFaceDetection.ts:104` — `default`
- `src/hooks/useContinuousAnalysis.ts:217` — `default`
- `src/hooks/useFrameBuffer.ts:63` — `pushFrame`
- `src/hooks/useFrameBuffer.ts:74` — `clearFrameBuffer`
- `src/hooks/useFrameBuffer.ts:87` — `getReplayFrames`
- _…e mais 53 (ver `summary.md`/`raw.json`)._

## Tipos não utilizados

### 🔴 alto — 1 item(ns)

> Revisar manualmente; pode estar em uso por lazy import, string dinâmica ou build externo.

- `src/components/video-player/index.ts:5` — `Detection`

### 🟡 médio — 159 item(ns)

> Verificar referências antes de remover; provável seguro após inspeção.

- `src/lib/alertSounds.ts:4` — `AlertSeverity`
- `src/lib/alertSounds.ts:5` — `ToneType`
- `src/lib/alertSounds.ts:9` — `SoundConfig`
- `src/lib/alertSounds.ts:18` — `SoundSettings`
- `src/lib/logger.ts:10` — `LogLevel`
- `src/lib/logger.ts:12` — `LogEntry`
- `src/contexts/ThemeContext.tsx:11` — `ThemeMode`
- `src/contexts/ThemeContext.tsx:11` — `ThemeVariant`
- `src/contexts/ThemeContext.tsx:11` — `ThemeState`
- `src/contexts/ThemeContext.tsx:11` — `ThemeContextType`
- `src/lib/errorReporter.ts:11` — `ErrorReport`
- `src/lib/clsMonitor.ts:133` — `TrackedRoute`
- `src/components/alerts/alertFilterTypes.ts:7` — `AlertSeverity`
- `src/components/AlertFilters.tsx:20` — `AlertType`
- `src/components/AlertFilters.tsx:20` — `AlertSeverity`
- `src/components/AlertFilters.tsx:20` — `DateRange`
- `src/components/AlertFilters.tsx:20` — `CameraOption`
- `src/types/rules.ts:13` — `RuleCategory`
- `src/types/rules.ts:14` — `RuleSeverity`
- `src/types/rules.ts:15` — `RuleActionType`
- `src/types/rules.ts:16` — `RuleConditionType`
- `src/types/rules.ts:17` — `RuleConditionOperator`
- `src/types/rules.ts:22` — `RuleCondition`
- `src/types/rules.ts:29` — `RuleSchedule`
- `src/types/rules.ts:36` — `UIRule`
- `src/types/rules.ts:96` — `Rule`
- `src/types/rules.ts:110` — `RuleTriggerType`
- `src/types/rules.ts:118` — `RuleTrigger`
- `src/types/rules.ts:123` — `RuleLegacyConditionOperator`
- `src/types/rules.ts:132` — `RuleLegacyCondition`
- `src/types/rules.ts:139` — `RuleLegacyActionType`
- `src/types/rules.ts:148` — `RuleLegacyAction`
- `src/types/rules.ts:154` — `RuleActionConfig`
- `src/types/rules.ts:163` — `RuleLegacySchedule`
- `src/types/rules.ts:172` — `RuleViolation`
- `src/components/FaceRecognitionOverlay.tsx:14` — `FaceRecognitionOverlayProps`
- `src/hooks/useHeatmap.tsx:11` — `HeatmapPoint`
- `src/hooks/useHeatmap.tsx:11` — `HeatmapData`
- `src/hooks/useHeatmap.tsx:11` — `HeatmapConfig`
- `src/hooks/useHeatmap.tsx:11` — `HeatmapStats`
- `src/hooks/useNotifications.ts:15` — `NotificationChannel`
- `src/hooks/useNotifications.ts:15` — `NotificationSeverity`
- `src/hooks/useNotifications.ts:15` — `NotificationStatus`
- `src/hooks/useNotifications.ts:15` — `NotificationConfig`
- `src/hooks/useNotifications.ts:15` — `Notification`
- `src/hooks/useNotifications.ts:15` — `NotificationStats`
- `src/hooks/useNotifications.ts:15` — `UseNotificationsOptions`
- `src/lib/pdfGenerator.ts:19` — `ReportSection`
- `src/lib/pdfGenerator.ts:25` — `TableRow`
- `src/hooks/useMLModels.ts:42` — `ModelType`
- `src/hooks/useMLModels.ts:42` — `ModelInfo`
- `src/hooks/useMLModels.ts:42` — `DetectedPose`
- `src/hooks/useMLModels.ts:42` — `MLModelsConfig`
- `src/hooks/useMLModels.ts:43` — `BackendType`
- `src/hooks/useMLModels.ts:43` — `PoseKeypoint`
- `src/hooks/useMLModels.ts:99` — `UseMLModelsReturn`
- `src/hooks/useStreamFaceDetection.ts:12` — `UseStreamFaceDetectionOptions`
- `src/hooks/useStreamFaceDetection.ts:12` — `UseStreamFaceDetectionReturn`
- `src/components/ZoneEditor.tsx:144` — `DrawingMode`
- `src/components/ZoneEditor.tsx:144` — `Point`
- `src/components/ZoneEditor.tsx:144` — `ZoneEditorProps`
- `src/components/ZoneEditor.tsx:145` — `Zone`
- `src/components/ZoneEditor.tsx:145` — `ZoneGeometry`
- `src/components/ZoneOverlay.tsx:12` — `Zone`
- `src/components/ZoneOverlay.tsx:12` — `Point`
- `src/components/ZoneOverlay.tsx:12` — `ZoneOverlayProps`
- `src/components/ZoneOverlay.tsx:13` — `ZoneType`
- `src/components/ZoneOverlay.tsx:13` — `ZoneGeometry`
- `src/components/ZoneOverlay.tsx:13` — `ZoneStats`
- `src/hooks/useFaceAPI.ts:24` — `FaceMatchStatus`
- `src/hooks/useFaceDetection.ts:20` — `DetectedFace`
- `src/hooks/useFaceDetection.ts:39` — `UseFaceDetectionOptions`
- `src/hooks/useFaceRecognitionAlerts.ts:18` — `RecognitionEvent`
- `src/hooks/useFaceRecognitionAlerts.ts:32` — `BlacklistPerson`
- `src/hooks/useFaceRecognitionAlerts.ts:42` — `VIPPerson`
- `src/hooks/useFaceRecognitionAlerts.ts:51` — `RecognitionStats`
- `src/hooks/useMediaMTX.ts:20` — `MediaMTXPath`
- `src/hooks/useMediaMTX.ts:38` — `MediaMTXConfig`
- `src/hooks/useMediaMTX.ts:45` — `StreamInfo`
- `src/hooks/useMediaMTX.ts:57` — `MediaMTXStats`
- _…e mais 79 (ver `summary.md`/`raw.json`)._

### 🟢 baixo — 11 item(ns)

> Remoção segura na maioria dos casos.

- `src/components/cameras/types.ts:6` — `CameraStatus`
- `src/components/sidebar/types.ts:36` — `SidebarContextValue`
- `src/types/continuousAnalysis/types.ts:31` — `AlertThresholds`
- `src/types/continuousAnalysis/types.ts:63` — `AnalysisSessionStatus`
- `src/types/continuousAnalysis/types.ts:148` — `BatchAnalysisConfig`
- `src/types/continuousAnalysis/types.ts:156` — `BatchAnalysisStatus`
- `src/types/zones/types.ts:10` — `ZoneShape`
- `src/types/zones/types.ts:16` — `TripwireDirection`
- `src/types/zones/types.ts:26` — `ZoneGeometry`
- `src/types/zones/types.ts:54` — `ZoneConfig`
- `src/types/zones/types.ts:73` — `ZoneRule`

## Dependências mortas (`dependencies`)

### 🔴 alto — 16 item(ns)

> Revisar manualmente; pode estar em uso por lazy import, string dinâmica ou build externo.

- `@radix-ui/react-aspect-ratio`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-menubar`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-radio-group`
- `@sentry/react`
- `@sentry/tracing`
- `@tanstack/react-virtual`
- `react-error-boundary`
- `react-hook-form`
- `react-i18next`
- `react-pdf`
- `react-resizable-panels`
- `react-virtuoso`
- `zustand`

### 🟡 médio — 9 item(ns)

> Verificar referências antes de remover; provável seguro após inspeção.

- `@hookform/resolvers`
- `cmdk`
- `embla-carousel-react`
- `i18next`
- `i18next-browser-languagedetector`
- `immer`
- `input-otp`
- `jotai`
- `vaul`

### 🟢 baixo — 8 item(ns)

> Remoção segura na maioria dos casos.

- `ably`
- `dompurify`
- `file-saver`
- `helmet`
- `pusher-js`
- `sanitize-html`
- `socket.io-client`
- `xss`

## DevDependencies mortas

### 🟢 baixo — 2 item(ns)

> Remoção segura na maioria dos casos.

- `@tanstack/react-query-devtools`
- `@testing-library/user-event`

## Exports duplicados

- `src/components/settings/NotificationSettingsPanel.tsx` — ``
- `src/lib/dateUtils.ts` — ``
- `src/lib/logger.ts` — ``
- `src/components/skeletons/FiltersBarSkeleton.tsx` — ``
- `src/components/skeletons/TabsSkeleton.tsx` — ``
- `src/components/skeletons/SkeletonErrorBoundary.tsx` — ``
- `src/lib/lazyLoad.tsx` — ``
- `src/components/dev/SkeletonToggleButton.tsx` — ``
- `src/components/dev/SkeletonFailureToggleButton.tsx` — ``
- `src/components/dev/MobileMenuChecklist.tsx` — ``
- `src/components/ErrorBoundary.tsx` — ``
- `src/components/LoadingSpinner.tsx` — ``
- `src/components/layout/MainLayout.tsx` — ``
- `src/components/ProtectedRoute.tsx` — ``
- `src/components/PanicButton.tsx` — ``
- `src/lib/errorReporter.ts` — ``
- `src/components/debug/CLSBadge.tsx` — ``
- `src/components/debug/CLSShiftOverlay.tsx` — ``
- `src/pages/DashboardV2.tsx` — ``
- `src/pages/CamerasPage.tsx` — ``
- `src/pages/AlertsPage.tsx` — ``
- `src/pages/ZonesPage.tsx` — ``
- `src/pages/RecordingsPage.tsx` — ``
- `src/pages/AnalyticsPage.tsx` — ``
- `src/pages/SettingsPage.tsx` — ``
- `src/pages/SecurityPage.tsx` — ``
- `src/components/AnalysisHistoryPanel.tsx` — ``
- `src/components/ArmDisarmControl.tsx` — ``
- `src/components/AutomationRulesManager.tsx` — ``
- `src/components/BottomNavigation.tsx` — ``
- `src/components/Breadcrumbs.tsx` — ``
- `src/components/ClipRecorderControls.tsx` — ``
- `src/components/EmptyState.tsx` — ``
- `src/components/FaceRecognitionOverlay.tsx` — ``
- `src/components/UserAvatar.tsx` — ``
- `src/components/NotificationBell.tsx` — ``
- `src/hooks/useOnlineStatus.ts` — ``
- `src/components/Header.tsx` — ``
- `src/hooks/useHeatmap.tsx` — ``
- `src/components/LicensePlateRecognition.tsx` — ``
- `src/components/LiveFaceRecognition.tsx` — ``
- `src/hooks/useNotifications.ts` — ``
- `src/hooks/useOfflineSync.ts` — ``
- `src/components/OfflineIndicator.tsx` — ``
- `src/hooks/useOnboardingTour.ts` — ``
- `src/components/OnboardingTour.tsx` — ``
- `src/components/PWAMigrationBanner.tsx` — ``
- `src/components/PageSkeletons.tsx` — ``
- `src/components/ReportsPanel.tsx` — ``
- `src/components/SeverityBadge.tsx` — ``
- _…e mais 34._

## Imports não declarados em `package.json`

> Pacotes importados no código mas ausentes em `dependencies`. **Risco alto** — deve ser corrigido (instalar ou remover o import).

- `@dnd-kit/utilities`
- `eslint-plugin-unused-imports`
- `prettier-plugin-tailwindcss`
- `sharp`

## Imports não resolvidos

> Caminhos que o knip não conseguiu resolver. Pode indicar paths quebrados ou aliases incorretos.

- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint-plugin-react`

## Próximos passos sugeridos

1. **Quick wins (🟢 baixo):** remova arquivos/exports/deps marcados como baixo risco em PR único.
2. **Verificação (🟡 médio):** para cada item, busque referências por string (`grep` no nome do arquivo ou rota) antes de remover.
3. **Auditoria manual (🔴 alto):** abrir issues separadas; muitos itens aqui são entrypoints reais de fluxos lazy/externos.
4. **Imports não declarados:** instalar a dep faltante OU remover o import — falha de CI pendente.
5. Rodar `npm run audit:deadcode` periodicamente; comparar `summary.json` em PRs.

---

_Gerado por `scripts/build-dependency-audit-report.mjs`._