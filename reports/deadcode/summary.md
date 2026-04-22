# Dead Code Audit (knip)

**Gerado em:** 2026-04-22T18:16:02.097Z  
**Duração:** 8.68s  
**Total de achados:** 767

## Resumo por categoria

| Categoria | Quantidade |
|-----------|-----------:|
| files | 232 |
| dependencies | 33 |
| devDependencies | 2 |
| optionalPeerDependencies | 0 |
| unlisted | 5 |
| unresolved | 3 |
| exports | 233 |
| types | 171 |
| enumMembers | 0 |
| classMembers | 0 |
| duplicates | 84 |
| binaries | 4 |

## Arquivos não utilizados (232)

- src/components/AccessDenied.tsx
- src/components/AlertDetail.tsx
- src/components/AlertNotification.tsx
- src/components/AuthCallback.tsx
- src/components/CameraCard.tsx
- src/components/CameraGrid.tsx
- src/components/CameraLayoutControls.tsx
- src/components/Dashboard.tsx
- src/components/DataTable.tsx
- src/components/DateRangePicker.tsx
- src/components/DetectionOverlay.tsx
- src/components/Divider.tsx
- src/components/Dock.tsx
- src/components/ErrorFallback.tsx
- src/components/ErrorState.tsx
- src/components/FloatingAction.tsx
- src/components/FocusTrap.tsx
- src/components/Gauge.tsx
- src/components/GlobalSearch.tsx
- src/components/Head.tsx
- src/components/ImageAnalysis.tsx
- src/components/KeyboardShortcuts.tsx
- src/components/LazyComponent.tsx
- src/components/LazyImage.tsx
- src/components/LazyLoad.tsx
- src/components/LiveRegion.tsx
- src/components/LoadingOverlay.tsx
- src/components/Meta.tsx
- src/components/NavLink.tsx
- src/components/NotificationConfig.tsx
- src/components/NotificationSettings.tsx
- src/components/PageHeader.tsx
- src/components/Pagination.tsx
- src/components/PersonCard.tsx
- src/components/PersonForm.tsx
- src/components/RecognitionLogs.tsx
- src/components/RuleCard.tsx
- src/components/RuleEditor.tsx
- src/components/SectionErrorBoundary.tsx
- src/components/SecuritySettings.tsx
- src/components/Spotlight.tsx
- src/components/StatCard.tsx
- src/components/StatusBadge.tsx
- src/components/StreamPlayer.tsx
- src/components/TableSkeleton.tsx
- src/components/TelegramConfig.tsx
- src/components/TelegramSettings.tsx
- src/components/TimeAgo.tsx
- src/components/Timeline.tsx
- src/components/Tooltip.tsx
- _…e mais 182 itens (ver `raw.json`)._

## Dependências não utilizadas (33)

- package.json:98 — @hookform/resolvers
- package.json:102 — @radix-ui/react-aspect-ratio
- package.json:106 — @radix-ui/react-context-menu
- package.json:109 — @radix-ui/react-hover-card
- package.json:111 — @radix-ui/react-menubar
- package.json:112 — @radix-ui/react-navigation-menu
- package.json:115 — @radix-ui/react-radio-group
- package.json:127 — @sentry/react
- package.json:128 — @sentry/tracing
- package.json:131 — @tanstack/react-virtual
- package.json:135 — ably
- package.json:138 — cmdk
- package.json:140 — dompurify
- package.json:141 — embla-carousel-react
- package.json:143 — file-saver
- package.json:145 — helmet
- package.json:148 — i18next
- package.json:149 — i18next-browser-languagedetector
- package.json:150 — immer
- package.json:151 — input-otp
- package.json:152 — jotai
- package.json:156 — pusher-js
- package.json:160 — react-error-boundary
- package.json:162 — react-hook-form
- package.json:163 — react-i18next
- package.json:164 — react-pdf
- package.json:165 — react-resizable-panels
- package.json:167 — react-virtuoso
- package.json:169 — sanitize-html
- package.json:170 — socket.io-client
- package.json:174 — vaul
- package.json:178 — xss
- package.json:180 — zustand

## DevDependencies não utilizadas (2)

- package.json:192 — @tanstack/react-query-devtools
- package.json:195 — @testing-library/user-event

## Imports não declarados em package.json (5)

- prettier.config.js — prettier-plugin-tailwindcss
- eslint.config.js — eslint-plugin-unused-imports
- src/components/widgets/WidgetWrapper.tsx — @dnd-kit/utilities
- scripts/generate-icons.js — sharp
- src/components/widgets/EnhancedWidgetWrapper.tsx — @dnd-kit/utilities

## Imports não resolvidos (3)

- .eslintrc.cjs — @typescript-eslint/eslint-plugin
- .eslintrc.cjs — eslint-plugin-react
- .eslintrc.cjs — @typescript-eslint/parser

## Exports não utilizados (233)

- src/components/widgets/EnhancedWidgetWrapper.tsx:22 — EnhancedWidgetWrapper
- src/components/cameras/EnhancedCameraGrid.tsx:63 — EnhancedCameraCard
- src/components/cameras/EnhancedCameraGrid.tsx:263 — CameraGrid
- src/components/settings/NotificationSettingsPanel.tsx:223 — default
- src/components/widgets/EnhancedWidgets.tsx:4 — EnhancedWidgetWrapper
- src/components/widgets/EnhancedWidgets.tsx:5 — WidgetGrid
- src/components/widgets/EnhancedWidgets.tsx:6 — StatCard
- src/components/widgets/EnhancedWidgets.tsx:7 — MiniChart
- src/lib/alertSounds.ts:79 — updateSoundSettings
- src/lib/dateUtils.ts:51 — getTimeAgo
- src/lib/dateUtils.ts:52 — getRelativeTime
- src/lib/errorTracking.ts:20 — default
- src/lib/ipUtils.ts:80 — getClientIP
- src/lib/logger.ts:142 — default
- src/components/skeletons/FiltersBarSkeleton.tsx:55 — default
- src/components/skeletons/TabsSkeleton.tsx:29 — default
- src/components/skeletons/SkeletonErrorBoundary.tsx:113 — default
- src/lib/lazyLoad.tsx:14 — LoadingFallback
- src/lib/lazyLoad.tsx:23 — PageLoadingFallback
- src/lib/lazyLoad.tsx:88 — LazyPages
- src/lib/lazyLoad.tsx:97 — default
- src/contexts/ThemeContext.tsx:10 — useTheme
- src/contexts/ThemeContext.tsx:14 — toggleTheme
- src/components/dev/SkeletonToggleButton.tsx:44 — default
- src/components/dev/SkeletonFailureToggleButton.tsx:75 — default
- src/components/dev/MobileMenuChecklist.tsx:229 — default
- src/components/ErrorBoundary.tsx:140 — withErrorBoundary
- src/components/ErrorBoundary.tsx:161 — ErrorBoundaryWrapper
- src/components/ErrorBoundary.tsx:197 — default
- src/components/LoadingSpinner.tsx:14 — LoadingSpinner
- src/components/LoadingSpinner.tsx:65 — default
- src/components/layout/MainLayout.tsx:146 — default
- src/components/ProtectedRoute.tsx:46 — default
- src/components/PanicButton.tsx:76 — default
- src/components/RouteErrorBoundary.tsx:18 — RouteErrorBoundary
- src/lib/errorReporter.ts:178 — default
- src/components/debug/CLSBadge.tsx:97 — default
- src/components/debug/CLSShiftOverlay.tsx:155 — default
- src/pages/DashboardV2.tsx:50 — DashboardV2
- src/pages/CamerasPage.tsx:29 — CamerasPage
- src/pages/AlertsPage.tsx:30 — AlertsPage
- src/pages/ZonesPage.tsx:27 — ZonesPage
- src/pages/RecordingsPage.tsx:30 — RecordingsPage
- src/pages/AnalyticsPage.tsx:34 — AnalyticsPage
- src/pages/SettingsPage.tsx:25 — SettingsPage
- src/pages/SecurityPage.tsx:22 — SecurityPage
- src/lib/clsMonitor.ts:290 — getAllReports
- src/components/alerts/alertFilterTypes.ts:49 — SEVERITY_LABELS
- src/components/AlertFilters.tsx:33 — AlertFiltersComponent
- src/components/AnalysisHistoryPanel.tsx:141 — default
- _…e mais 183 itens (ver `raw.json`)._

## Tipos não utilizados (171)

- src/lib/alertSounds.ts:4 — AlertSeverity
- src/lib/alertSounds.ts:5 — ToneType
- src/lib/alertSounds.ts:9 — SoundConfig
- src/lib/alertSounds.ts:18 — SoundSettings
- src/lib/logger.ts:10 — LogLevel
- src/lib/logger.ts:12 — LogEntry
- src/contexts/ThemeContext.tsx:11 — ThemeMode
- src/contexts/ThemeContext.tsx:11 — ThemeVariant
- src/contexts/ThemeContext.tsx:11 — ThemeState
- src/contexts/ThemeContext.tsx:11 — ThemeContextType
- src/lib/errorReporter.ts:11 — ErrorReport
- src/lib/clsMonitor.ts:133 — TrackedRoute
- src/components/alerts/alertFilterTypes.ts:7 — AlertSeverity
- src/components/AlertFilters.tsx:20 — AlertType
- src/components/AlertFilters.tsx:20 — AlertSeverity
- src/components/AlertFilters.tsx:20 — DateRange
- src/components/AlertFilters.tsx:20 — CameraOption
- src/types/rules.ts:13 — RuleCategory
- src/types/rules.ts:14 — RuleSeverity
- src/types/rules.ts:15 — RuleActionType
- src/types/rules.ts:16 — RuleConditionType
- src/types/rules.ts:17 — RuleConditionOperator
- src/types/rules.ts:22 — RuleCondition
- src/types/rules.ts:29 — RuleSchedule
- src/types/rules.ts:36 — UIRule
- src/types/rules.ts:96 — Rule
- src/types/rules.ts:110 — RuleTriggerType
- src/types/rules.ts:118 — RuleTrigger
- src/types/rules.ts:123 — RuleLegacyConditionOperator
- src/types/rules.ts:132 — RuleLegacyCondition
- src/types/rules.ts:139 — RuleLegacyActionType
- src/types/rules.ts:148 — RuleLegacyAction
- src/types/rules.ts:154 — RuleActionConfig
- src/types/rules.ts:163 — RuleLegacySchedule
- src/types/rules.ts:172 — RuleViolation
- src/components/FaceRecognitionOverlay.tsx:14 — FaceRecognitionOverlayProps
- src/hooks/useHeatmap.tsx:11 — HeatmapPoint
- src/hooks/useHeatmap.tsx:11 — HeatmapData
- src/hooks/useHeatmap.tsx:11 — HeatmapConfig
- src/hooks/useHeatmap.tsx:11 — HeatmapStats
- src/hooks/useNotifications.ts:15 — NotificationChannel
- src/hooks/useNotifications.ts:15 — NotificationSeverity
- src/hooks/useNotifications.ts:15 — NotificationStatus
- src/hooks/useNotifications.ts:15 — NotificationConfig
- src/hooks/useNotifications.ts:15 — Notification
- src/hooks/useNotifications.ts:15 — NotificationStats
- src/hooks/useNotifications.ts:15 — UseNotificationsOptions
- src/lib/pdfGenerator.ts:19 — ReportSection
- src/lib/pdfGenerator.ts:25 — TableRow
- src/hooks/useMLModels.ts:42 — ModelType
- _…e mais 121 itens (ver `raw.json`)._

## Exports duplicados (84)

- src/components/settings/NotificationSettingsPanel.tsx — [{"name":"NotificationSettingsPanel","line":15,"col":32,"pos":731},{"name":"default","line":223,"col":15,"pos":8229}]
- src/lib/dateUtils.ts — [{"name":"formatRelativeTime","line":20,"col":13,"pos":566},{"name":"getTimeAgo","line":51,"col":26,"pos":1571},{"name":"getRelativeTime","line":52,"col":31,"pos":1622}]
- src/lib/logger.ts — [{"name":"logger","line":111,"col":13,"pos":2711},{"name":"default","line":142,"col":15,"pos":4013}]
- src/components/skeletons/FiltersBarSkeleton.tsx — [{"name":"FiltersBarSkeleton","line":10,"col":2,"pos":255},{"name":"default","line":55,"col":15,"pos":1647}]
- src/components/skeletons/TabsSkeleton.tsx — [{"name":"TabsSkeleton","line":7,"col":2,"pos":163},{"name":"default","line":29,"col":15,"pos":719}]
- src/components/skeletons/SkeletonErrorBoundary.tsx — [{"name":"SkeletonErrorBoundary","line":54,"col":2,"pos":1919},{"name":"default","line":113,"col":15,"pos":3493}]
- src/lib/lazyLoad.tsx — [{"name":"LazyPages","line":88,"col":13,"pos":2503},{"name":"default","line":97,"col":15,"pos":3060}]
- src/components/dev/SkeletonToggleButton.tsx — [{"name":"SkeletonToggleButton","line":4,"col":34,"pos":199},{"name":"default","line":44,"col":15,"pos":1611}]
- src/components/dev/SkeletonFailureToggleButton.tsx — [{"name":"SkeletonFailureToggleButton","line":19,"col":3,"pos":535},{"name":"default","line":75,"col":15,"pos":2327}]
- src/components/dev/MobileMenuChecklist.tsx — [{"name":"MobileMenuChecklist","line":39,"col":3,"pos":1441},{"name":"default","line":229,"col":15,"pos":7617}]
- src/components/ErrorBoundary.tsx — [{"name":"ErrorBoundary","line":25,"col":2,"pos":743},{"name":"default","line":197,"col":15,"pos":5874}]
- src/components/LoadingSpinner.tsx — [{"name":"LoadingSpinner","line":14,"col":13,"pos":351},{"name":"default","line":65,"col":15,"pos":2871}]
- src/components/layout/MainLayout.tsx — [{"name":"MainLayout","line":34,"col":2,"pos":1633},{"name":"default","line":146,"col":15,"pos":4885}]
- src/components/ProtectedRoute.tsx — [{"name":"ProtectedRoute","line":16,"col":13,"pos":516},{"name":"default","line":46,"col":15,"pos":1282}]
- src/components/PanicButton.tsx — [{"name":"PanicButton","line":17,"col":13,"pos":453},{"name":"default","line":76,"col":15,"pos":2699}]
- src/lib/errorReporter.ts — [{"name":"errorReporter","line":125,"col":13,"pos":3346},{"name":"default","line":178,"col":15,"pos":4981}]
- src/components/debug/CLSBadge.tsx — [{"name":"CLSBadge","line":19,"col":2,"pos":618},{"name":"default","line":97,"col":15,"pos":3154}]
- src/components/debug/CLSShiftOverlay.tsx — [{"name":"CLSShiftOverlay","line":59,"col":2,"pos":1760},{"name":"default","line":155,"col":15,"pos":4714}]
- src/pages/DashboardV2.tsx — [{"name":"DashboardV2","line":48,"col":2,"pos":2935},{"name":"default","line":219,"col":15,"pos":17121}]
- src/pages/CamerasPage.tsx — [{"name":"CamerasPage","line":27,"col":62,"pos":1062},{"name":"default","line":230,"col":15,"pos":9819}]
- src/pages/AlertsPage.tsx — [{"name":"AlertsPage","line":28,"col":62,"pos":1601},{"name":"default","line":232,"col":15,"pos":14817}]
- src/pages/ZonesPage.tsx — [{"name":"ZonesPage","line":25,"col":36,"pos":1414},{"name":"default","line":294,"col":15,"pos":17663}]
- src/pages/RecordingsPage.tsx — [{"name":"RecordingsPage","line":28,"col":68,"pos":1706},{"name":"default","line":257,"col":15,"pos":17004}]
- src/pages/AnalyticsPage.tsx — [{"name":"AnalyticsPage","line":32,"col":128,"pos":1929},{"name":"default","line":298,"col":15,"pos":17595}]
- src/pages/SettingsPage.tsx — [{"name":"SettingsPage","line":23,"col":62,"pos":1185},{"name":"default","line":108,"col":15,"pos":5100}]
- src/pages/SecurityPage.tsx — [{"name":"SecurityPage","line":20,"col":123,"pos":1051},{"name":"default","line":123,"col":15,"pos":7212}]
- src/components/AnalysisHistoryPanel.tsx — [{"name":"AnalysisHistoryPanel","line":69,"col":13,"pos":4046},{"name":"default","line":141,"col":15,"pos":8899}]
- src/components/ArmDisarmControl.tsx — [{"name":"ArmDisarmControl","line":18,"col":2,"pos":450},{"name":"default","line":83,"col":15,"pos":2384}]
- src/components/AutomationRulesManager.tsx — [{"name":"AutomationRulesManager","line":19,"col":77,"pos":967},{"name":"default","line":134,"col":15,"pos":6431}]
- src/components/BottomNavigation.tsx — [{"name":"BottomNavigation","line":11,"col":78,"pos":482},{"name":"default","line":148,"col":15,"pos":8065}]
- src/components/Breadcrumbs.tsx — [{"name":"Breadcrumbs","line":86,"col":13,"pos":2522},{"name":"default","line":211,"col":15,"pos":7347}]
- src/components/ClipRecorderControls.tsx — [{"name":"ClipRecorderControls","line":28,"col":80,"pos":889},{"name":"default","line":138,"col":15,"pos":6828}]
- src/components/EmptyState.tsx — [{"name":"EmptyState","line":18,"col":13,"pos":441},{"name":"default","line":80,"col":15,"pos":2964}]
- src/components/FaceRecognitionOverlay.tsx — [{"name":"FaceRecognitionOverlay","line":68,"col":2,"pos":4600},{"name":"default","line":105,"col":15,"pos":6830}]
- src/components/UserAvatar.tsx — [{"name":"UserAvatar","line":12,"col":13,"pos":281},{"name":"default","line":22,"col":15,"pos":679}]
- src/components/NotificationBell.tsx — [{"name":"NotificationBell","line":6,"col":13,"pos":187},{"name":"default","line":20,"col":15,"pos":736}]
- src/hooks/useOnlineStatus.ts — [{"name":"useOnlineStatus","line":14,"col":2,"pos":368},{"name":"default","line":20,"col":15,"pos":490}]
- src/components/Header.tsx — [{"name":"Header","line":19,"col":13,"pos":756},{"name":"default","line":100,"col":15,"pos":3737}]
- src/hooks/useHeatmap.tsx — [{"name":"useHeatmap","line":37,"col":2,"pos":1328},{"name":"default","line":218,"col":15,"pos":9480}]
- src/components/LicensePlateRecognition.tsx — [{"name":"LicensePlateRecognition","line":17,"col":63,"pos":866},{"name":"default","line":119,"col":15,"pos":6499}]
- src/components/LiveFaceRecognition.tsx — [{"name":"LiveFaceRecognition","line":24,"col":2,"pos":989},{"name":"default","line":113,"col":15,"pos":6361}]
- src/hooks/useNotifications.ts — [{"name":"useNotifications","line":15,"col":157,"pos":684},{"name":"default","line":113,"col":15,"pos":8623}]
- src/hooks/useOfflineSync.ts — [{"name":"useOfflineSync","line":53,"col":23,"pos":1282},{"name":"default","line":353,"col":15,"pos":8949}]
- src/components/OfflineIndicator.tsx — [{"name":"OfflineIndicator","line":36,"col":2,"pos":778},{"name":"default","line":259,"col":15,"pos":8148}]
- src/hooks/useOnboardingTour.ts — [{"name":"useOnboardingTour","line":40,"col":2,"pos":934},{"name":"default","line":131,"col":15,"pos":3171}]
- src/components/OnboardingTour.tsx — [{"name":"OnboardingTour","line":40,"col":80,"pos":3189},{"name":"default","line":63,"col":15,"pos":4797}]
- src/components/PWAMigrationBanner.tsx — [{"name":"PWAMigrationBanner","line":16,"col":78,"pos":687},{"name":"default","line":115,"col":15,"pos":3540}]
- src/components/PageSkeletons.tsx — [{"name":"PageSkeleton","line":65,"col":3,"pos":3130},{"name":"default","line":83,"col":15,"pos":3815}]
- src/components/ReportsPanel.tsx — [{"name":"ReportsPanel","line":17,"col":57,"pos":765},{"name":"default","line":111,"col":15,"pos":7785}]
- src/components/SeverityBadge.tsx — [{"name":"SeverityBadge","line":18,"col":13,"pos":421},{"name":"default","line":24,"col":15,"pos":652}]
- _…e mais 34 itens (ver `raw.json`)._

## Binários não utilizados (4)

- package.json — vite-bundle-analyzer
- package.json — storybook
- package.json — i18next-parser
- package.json — semantic-release
