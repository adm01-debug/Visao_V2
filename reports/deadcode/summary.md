# Dead Code Audit (knip)

**Gerado em:** 2026-08-05T11:03:29.834Z  
**Duração:** 4.38s  
**Total de achados:** 979

## Resumo por categoria

| Categoria | Quantidade |
|-----------|-----------:|
| files | 0 |
| dependencies | 30 |
| devDependencies | 5 |
| optionalPeerDependencies | 0 |
| unlisted | 35 |
| unresolved | 2 |
| exports | 434 |
| types | 284 |
| enumMembers | 0 |
| classMembers | 0 |
| duplicates | 112 |
| binaries | 77 |

## Dependências não utilizadas (30)

- package.json:324 — @radix-ui/react-aspect-ratio
- package.json:328 — @radix-ui/react-context-menu
- package.json:331 — @radix-ui/react-hover-card
- package.json:333 — @radix-ui/react-menubar
- package.json:334 — @radix-ui/react-navigation-menu
- package.json:349 — @sentry/react
- package.json:350 — @sentry/tracing
- package.json:353 — @tanstack/react-virtual
- package.json:357 — ably
- package.json:363 — dom-accessibility-api
- package.json:364 — dompurify
- package.json:365 — embla-carousel-react
- package.json:367 — fast-glob
- package.json:368 — file-saver
- package.json:370 — helmet
- package.json:373 — i18next
- package.json:374 — i18next-browser-languagedetector
- package.json:376 — input-otp
- package.json:377 — jotai
- package.json:382 — pusher-js
- package.json:386 — react-error-boundary
- package.json:389 — react-i18next
- package.json:390 — react-pdf
- package.json:391 — react-resizable-panels
- package.json:393 — react-virtuoso
- package.json:395 — sanitize-html
- package.json:396 — socket.io-client
- package.json:400 — uri-js
- package.json:401 — vaul
- package.json:405 — xss

## DevDependencies não utilizadas (5)

- package.json:415 — @rolldown/pluginutils
- package.json:421 — @tanstack/react-query-devtools
- package.json:440 — eslint-scope
- package.json:441 — eslint-visitor-keys
- package.json:442 — espree

## Imports não declarados em package.json (35)

- .eslintrc.cjs — @typescript-eslint/parser
- prettier.config.js — prettier-plugin-tailwindcss
- scripts/simulate-wave118-scenarios.mjs:15 — esbuild
- scripts/check-healing-arbiter.mjs:35 — esbuild
- scripts/simulate-wave166-plan-navigator.mjs:18 — esbuild
- scripts/simulate-wave167-attention-router.mjs:16 — esbuild
- scripts/simulate-wave168-attention-clock.mjs:17 — esbuild
- scripts/simulate-wave169-shift-handoff.mjs:23 — esbuild
- scripts/generate-icons.js:1 — sharp
- supabase/functions/admin-slow-queries/index.ts:7 — npm
- supabase/functions/agent-ingest/index.ts:4 — npm
- supabase/functions/agent-pair/index.ts:4 — npm
- supabase/functions/alertmanager-silence/index.ts:17 — npm
- supabase/functions/camera-io-control/index.ts:17 — npm
- supabase/functions/camera-ptz-control/index.ts:5 — npm
- supabase/functions/csp-report/index.ts:12 — npm
- supabase/functions/device-connect/index.ts:17 — npm
- supabase/functions/device-commands/index.ts:26 — npm
- supabase/functions/evidence-seal/index.ts:22 — npm
- supabase/functions/firmware-fingerprint/index.ts:10 — npm
- supabase/functions/fleet-health/index.ts:21 — npm
- supabase/functions/health/index.ts:6 — npm
- supabase/functions/ingest-auth/index.ts:15 — npm
- supabase/functions/insightface-migrate-batch/index.ts:6 — npm
- supabase/functions/metrics-prometheus/index.ts:4 — npm
- supabase/functions/nvr-recording-convert/index.ts:25 — npm
- supabase/functions/nvr-recording-download/index.ts:15 — npm
- supabase/functions/onvif-autodiscover/index.ts:11 — npm
- supabase/functions/ptz-backends-test/index.ts:6 — npm
- supabase/functions/ptz-onvif-discover/index.ts:4 — npm
- supabase/functions/ptz-presets-import/index.ts:8 — npm
- supabase/functions/public-api/index.ts:5 — npm
- supabase/functions/rtsp-preview/index.ts:12 — npm
- supabase/functions/settings-backup/index.ts:4 — npm
- supabase/functions/timeline-attest/index.ts:23 — npm

## Imports não resolvidos (2)

- .eslintrc.cjs — eslint-plugin-react
- scripts/simulate-wave123-scenarios.mjs — src/lib/relayHealingArbiter.ts

## Exports não utilizados (434)

- src/lib/agentHealing.ts:77 — EMPTY_RELAY_STATS
- src/lib/views/favoriteViewRestore.ts:35 — isMonitorLayout
- src/lib/devices/deviceEnrollment.ts:36 — ENROLLMENT_TTL_MS
- src/lib/views/detachedMonitor.ts:80 — makeWindowName
- src/lib/maintenanceEscalation.ts:120 — UNDELIVERED_DISPATCH
- src/lib/maintenanceEscalation.ts:279 — thresholdsFromProfile
- src/lib/retention/retentionAlerts.ts:44 — RETENTION_ROUTINE_PREFIX
- src/lib/faces/personTimeline.ts:52 — MIN_TRANSIT_MS
- src/lib/faces/faceSearch.ts:60 — MIN_SIMILARITY
- src/lib/faces/faceSearch.ts:61 — MAX_SIMILARITY
- src/lib/faces/faceSearch.ts:64 — MAX_CAMERAS
- src/lib/faces/faceSearch.ts:67 — UNKNOWN_ATTRIBUTE_POLICY
- src/lib/faces/faceSearch.ts:327 — sortFaceResults
- src/lib/faces/timelineAttestation.ts:51 — ATTESTATION_FORMAT
- src/lib/faces/timelineAttestation.ts:52 — ATTESTATION_VERSION
- src/lib/faces/timelineAttestation.ts:53 — ATTESTATION_ALGORITHM
- src/lib/faces/timelineAttestation.ts:62 — ATTESTATION_DISCLOSURE
- src/lib/faces/timelineAttestation.ts:71 — ATTESTATION_HOW_TO_VERIFY
- src/lib/faces/timelineAttestation.ts:397 — stayPayload
- src/lib/faces/timelineAttestation.ts:417 — buildAttestationChain
- src/lib/faces/attestationBatch.ts:55 — DOSSIER_FORMAT
- src/lib/provenance/readingProvenance.ts:83 — CORROBORATION_FLOOR
- src/lib/provenance/readingProvenance.ts:93 — PROVENANCE_DESCRIPTION
- src/lib/vision/frameBus.ts:420 — isUnknownConsumer
- src/lib/vision/pipelineFleet.ts:74 — worstPressure
- src/lib/vision/pipelineMetrics.ts:63 — DEFAULT_LATENCY_BUCKETS_MS
- src/lib/vision/pipelineMetrics.ts:164 — DEFAULT_COST_MODEL
- src/lib/vision/pipelineMetrics.ts:451 — metricsVerdictRank
- src/lib/vision/pipelineMetrics.ts:465 — DEFAULT_METRICS_THRESHOLDS
- src/lib/vision/processors/index.ts:217 — DEFAULT_FACE_THRESHOLD
- src/lib/alarms/admissionRetention.ts:42 — BATCH_CAP_MIN
- src/lib/alarms/admissionRetention.ts:43 — BATCH_CAP_MAX
- src/lib/alarms/admissionRetention.ts:99 — readInstant
- src/lib/alarms/admissionBacklogAlert.ts:53 — ADMISSION_BACKLOG_PREFIX
- src/lib/alarms/admissionBacklogAlert.ts:56 — ADMISSION_BACKLOG_JOB
- src/lib/alarms/admissionBacklogAlert.ts:280 — buildBacklogAlert
- src/lib/alarms/admissionOrphanTrend.ts:66 — orphanTrendLabel
- src/lib/alarms/admissionTrendAlert.ts:63 — ADMISSION_TREND_JOB
- src/lib/alarms/admissionTrendAlert.ts:66 — TREND_CADENCE_MINUTES
- src/lib/alarms/admissionTrendAlert.ts:69 — COOLDOWN_FLOOR_MINUTES
- src/lib/alarms/admissionTrendAlert.ts:70 — COOLDOWN_CEILING_MINUTES
- src/lib/alarms/admissionOrphanAlert.ts:57 — ADMISSION_RECONCILE_PREFIX
- src/lib/alarms/admissionOrphanAlert.ts:60 — ADMISSION_RECONCILE_JOB
- src/lib/alarms/reconcileSnapshotRetention.ts:46 — SNAPSHOT_BATCH_CAP_MIN
- src/lib/alarms/reconcileSnapshotRetention.ts:47 — SNAPSHOT_BATCH_CAP_MAX
- src/lib/alarms/reconcileSnapshotRetention.ts:125 — readInstant
- src/lib/escalationProfiles.ts:164 — ESCALATION_PROFILES
- src/lib/escalationProfiles.ts:170 — DEFAULT_ESCALATION_PROFILE
- src/lib/maintenance/suppressionRetention.ts:42 — SUPPRESSION_RETENTION_DAYS_MIN
- src/lib/maintenance/suppressionRetention.ts:43 — SUPPRESSION_RETENTION_DAYS_MAX
- _…e mais 384 itens (ver `raw.json`)._

## Tipos não utilizados (284)

- src/lib/views/favoriteViewRestore.ts:53 — OverflowReason
- src/lib/views/favoriteViewRestore.ts:75 — OverflowSlot
- src/lib/devices/deviceEnrollment.ts:61 — AuthOutcome
- src/lib/devices/deviceEnrollment.ts:64 — AuthReason
- src/lib/views/detachedMonitor.ts:47 — DetachDecision
- src/lib/maintenanceEscalation.ts:69 — EscalationVerdictSeverity
- src/lib/faces/personTimeline.ts:57 — StayConfidence
- src/lib/faces/personTimeline.ts:76 — TransitFlag
- src/lib/faces/faceSearch.ts:90 — FaceAttributeFilter
- src/lib/faces/faceSearch.ts:97 — NormalizedAttributeFilter
- src/lib/faces/timelineAttestation.ts:135 — TimelineEvidenceStats
- src/lib/faces/timelineAttestation.ts:147 — AttestationIssuance
- src/lib/faces/timelineAttestation.ts:160 — AttestationWindow
- src/lib/faces/timelineAttestation.ts:176 — AttestedStay
- src/lib/faces/timelineAttestation.ts:190 — AttestedTransit
- src/lib/faces/attestationBatch.ts:58 — DossierEntry
- src/lib/faces/attestationBatch.ts:174 — SealConflict
- src/lib/provenance/readingProvenance.ts:179 — ProvenanceCaveatCode
- src/lib/provenance/readingProvenance.ts:188 — ProvenanceCaveat
- src/lib/vision/frameBus.ts:95 — FrameDelivery
- src/lib/vision/frameBus.ts:112 — ConsumerStats
- src/lib/vision/frameBus.ts:119 — ConsumerSlot
- src/lib/vision/pipelineFleet.ts:183 — FleetBuckets
- src/lib/vision/pipelineMetrics.ts:67 — LatencyDigest
- src/lib/vision/pipelineMetrics.ts:159 — CostModel
- src/lib/vision/pipelineMetrics.ts:166 — CostLedger
- src/lib/vision/pipelineMetrics.ts:221 — DropCounts
- src/lib/vision/pipelineMetrics.ts:442 — MetricsVerdict
- src/lib/vision/processors/index.ts:69 — FrameResolver
- src/lib/vision/processors/index.ts:81 — TimerFn
- src/lib/alarms/admissionRetention.ts:56 — RetentionOutcome
- src/lib/alarms/admissionRetention.ts:58 — RetentionDecision
- src/lib/alarms/admissionRetention.ts:85 — RetentionRefusal
- src/lib/alarms/reconcileSnapshotRetention.ts:68 — SnapshotVerdict
- src/lib/alarms/reconcileSnapshotRetention.ts:78 — SnapshotOutcome
- src/lib/alarms/reconcileSnapshotRetention.ts:80 — SnapshotDecision
- src/lib/alarms/reconcileSnapshotRetention.ts:110 — SnapshotPurgeRefusal
- src/lib/escalationProfiles.ts:87 — EscalationAnchorMode
- src/lib/maintenance/suppressionRetention.ts:59 — RetentionChannel
- src/lib/maintenance/suppressionRetention.ts:75 — SuppressionOutcome
- src/lib/maintenance/suppressionRetention.ts:77 — SuppressionDecision
- src/lib/maintenance/suppressionRetention.ts:84 — SuppressionRefusal
- src/lib/maintenance/conditionSilence.ts:62 — SilenceChannel
- src/lib/maintenance/conditionSilence.ts:77 — ChannelSilenceState
- src/lib/maintenance/conditionSilence.ts:79 — ChannelSilenceView
- src/lib/maintenance/suppressionLedger.ts:48 — SuppressionChannel
- src/lib/maintenance/suppressionLedger.ts:72 — ConditionSuppression
- src/lib/devices/remoteCommandDelivery.ts:63 — CommandStatus
- src/lib/devices/remoteCommandDelivery.ts:104 — PollAction
- src/lib/devices/remoteCommandDelivery.ts:118 — PollReason
- _…e mais 234 itens (ver `raw.json`)._

## Exports duplicados (112)

- src/lib/escalationProfiles.ts — [{"name":"OPERATIONAL_PROFILE","line":118,"col":14,"pos":6003},{"name":"DEFAULT_ESCALATION_PROFILE","line":170,"col":14,"pos":8025}]
- src/components/AutomationRulesManager.tsx — [{"name":"AutomationRulesManager","line":30,"col":17,"pos":1107},{"name":"default","line":246,"col":16,"pos":8034}]
- src/components/BottomNavigation.tsx — [{"name":"BottomNavigation","line":15,"col":17,"pos":618},{"name":"default","line":225,"col":16,"pos":9441}]
- src/components/GlobalSearch.tsx — [{"name":"GlobalSearch","line":24,"col":17,"pos":653},{"name":"default","line":330,"col":16,"pos":11802}]
- src/components/OfflineIndicator.tsx — [{"name":"OfflineIndicator","line":30,"col":17,"pos":783},{"name":"default","line":230,"col":16,"pos":7885}]
- src/components/settings/NotificationSettingsPanel.tsx — [{"name":"NotificationSettingsPanel","line":26,"col":17,"pos":766},{"name":"default","line":227,"col":16,"pos":8178}]
- src/lib/dateUtils.ts — [{"name":"formatRelativeTime","line":20,"col":14,"pos":567},{"name":"getTimeAgo","line":51,"col":14,"pos":1559},{"name":"getRelativeTime","line":52,"col":14,"pos":1605}]
- src/lib/logger.ts — [{"name":"logger","line":119,"col":14,"pos":3015},{"name":"default","line":150,"col":16,"pos":4315}]
- src/components/cameras/LivePreviewPlayer.tsx — [{"name":"LivePreviewPlayer","line":64,"col":17,"pos":2887},{"name":"default","line":453,"col":16,"pos":15869}]
- src/components/skeletons/FiltersBarSkeleton.tsx — [{"name":"FiltersBarSkeleton","line":16,"col":17,"pos":396},{"name":"default","line":55,"col":16,"pos":1647}]
- src/components/skeletons/TabsSkeleton.tsx — [{"name":"TabsSkeleton","line":13,"col":17,"pos":309},{"name":"default","line":29,"col":16,"pos":719}]
- src/components/skeletons/SkeletonErrorBoundary.tsx — [{"name":"SkeletonErrorBoundary","line":57,"col":14,"pos":1938},{"name":"default","line":111,"col":16,"pos":3462}]
- src/lib/lazyLoad.tsx — [{"name":"LazyPages","line":86,"col":14,"pos":2485},{"name":"default","line":95,"col":16,"pos":3042}]
- src/components/dev/SkeletonToggleButton.tsx — [{"name":"SkeletonToggleButton","line":10,"col":17,"pos":356},{"name":"default","line":48,"col":16,"pos":1636}]
- src/components/dev/SkeletonFailureToggleButton.tsx — [{"name":"SkeletonFailureToggleButton","line":26,"col":17,"pos":768},{"name":"default","line":73,"col":16,"pos":2307}]
- src/components/dev/MobileMenuChecklist.tsx — [{"name":"MobileMenuChecklist","line":41,"col":17,"pos":1459},{"name":"default","line":225,"col":16,"pos":7554}]
- src/components/ErrorBoundary.tsx — [{"name":"ErrorBoundary","line":27,"col":14,"pos":758},{"name":"default","line":184,"col":16,"pos":5657}]
- src/components/LoadingSpinner.tsx — [{"name":"LoadingSpinner","line":14,"col":14,"pos":352},{"name":"default","line":88,"col":16,"pos":3017}]
- src/components/layout/MainLayout.tsx — [{"name":"MainLayout","line":38,"col":17,"pos":1723},{"name":"default","line":152,"col":16,"pos":5014}]
- src/components/ProtectedRoute.tsx — [{"name":"ProtectedRoute","line":16,"col":14,"pos":517},{"name":"default","line":46,"col":16,"pos":1283}]
- src/components/PanicButton.tsx — [{"name":"PanicButton","line":17,"col":14,"pos":454},{"name":"default","line":81,"col":16,"pos":2861}]
- src/lib/errorReporter.ts — [{"name":"errorReporter","line":134,"col":14,"pos":3583},{"name":"default","line":180,"col":16,"pos":5174}]
- src/hooks/useOfflineSync.ts — [{"name":"useOfflineSync","line":55,"col":17,"pos":1301},{"name":"default","line":353,"col":16,"pos":9240}]
- src/lib/browserNotifications.ts — [{"name":"showBrowserNotification","line":41,"col":14,"pos":1126},{"name":"showNotification","line":100,"col":14,"pos":2601}]
- src/components/Sidebar.tsx — [{"name":"Sidebar","line":42,"col":14,"pos":1057},{"name":"default","line":43,"col":16,"pos":1106}]
- src/components/Header.tsx — [{"name":"Header","line":18,"col":14,"pos":945},{"name":"default","line":116,"col":16,"pos":4244}]
- src/components/PWAMigrationBanner.tsx — [{"name":"PWAMigrationBanner","line":17,"col":17,"pos":703},{"name":"default","line":106,"col":16,"pos":3432}]
- src/components/skeletons/SkeletonFallback.tsx — [{"name":"SkeletonFallback","line":25,"col":17,"pos":959},{"name":"default","line":128,"col":16,"pos":4065}]
- src/hooks/useGlobalShortcuts.ts — [{"name":"useGlobalShortcuts","line":15,"col":17,"pos":305},{"name":"default","line":208,"col":16,"pos":5338}]
- src/components/ShortcutsHelpDialog.tsx — [{"name":"ShortcutsHelpDialog","line":28,"col":17,"pos":699},{"name":"default","line":78,"col":16,"pos":2592}]
- src/components/PageSkeletons.tsx — [{"name":"PageSkeleton","line":105,"col":17,"pos":3399},{"name":"default","line":128,"col":16,"pos":4081}]
- src/components/OnboardingTour.tsx — [{"name":"OnboardingTour","line":154,"col":17,"pos":3994},{"name":"default","line":231,"col":16,"pos":6034}]
- src/components/cameras/AddCameraDialog.tsx — [{"name":"AddCameraDialog","line":195,"col":17,"pos":6299},{"name":"default","line":1849,"col":16,"pos":72037}]
- src/components/cameras/AddNvrDialog.tsx — [{"name":"AddNvrDialog","line":76,"col":17,"pos":2266},{"name":"default","line":383,"col":16,"pos":13467}]
- src/components/cameras/FirstCameraEmptyState.tsx — [{"name":"FirstCameraEmptyState","line":32,"col":17,"pos":905},{"name":"default","line":91,"col":16,"pos":3238}]
- src/components/cameras/CameraSetupWizard.tsx — [{"name":"CameraSetupWizard","line":89,"col":17,"pos":2517},{"name":"default","line":551,"col":16,"pos":20355}]
- src/components/cameras/RtspValidationPanel.tsx — [{"name":"RtspValidationPanel","line":57,"col":17,"pos":1968},{"name":"default","line":144,"col":16,"pos":5183}]
- src/components/EmptyState.tsx — [{"name":"EmptyState","line":18,"col":14,"pos":442},{"name":"default","line":119,"col":16,"pos":3255}]
- src/components/admin/AgentHealingTrailCard.tsx — [{"name":"AgentHealingTrailCard","line":44,"col":17,"pos":1813},{"name":"default","line":168,"col":16,"pos":6683}]
- src/hooks/useFaceRecognitionAlerts.ts — [{"name":"useFaceRecognitionAlerts","line":95,"col":17,"pos":2553},{"name":"default","line":357,"col":16,"pos":9797}]
- src/components/playback/SyncPlaybackGrid.tsx — [{"name":"SyncPlaybackGrid","line":48,"col":17,"pos":1599},{"name":"default","line":255,"col":16,"pos":8570}]
- src/components/LiveFaceRecognition.tsx — [{"name":"LiveFaceRecognition","line":30,"col":17,"pos":1014},{"name":"default","line":220,"col":16,"pos":7081}]
- src/hooks/useFaceAPI.ts — [{"name":"useFaceAPI","line":53,"col":17,"pos":1294},{"name":"default","line":141,"col":16,"pos":3753}]
- src/components/LicensePlateRecognition.tsx — [{"name":"LicensePlateRecognition","line":21,"col":17,"pos":886},{"name":"default","line":214,"col":16,"pos":7804}]
- src/hooks/useHeatmap.tsx — [{"name":"useHeatmap","line":44,"col":17,"pos":1356},{"name":"default","line":314,"col":16,"pos":10298}]
- src/components/ReportsPanel.tsx — [{"name":"ReportsPanel","line":19,"col":17,"pos":783},{"name":"default","line":267,"col":16,"pos":9052}]
- src/hooks/usePPEDetection.ts — [{"name":"usePPEDetection","line":43,"col":17,"pos":1023},{"name":"default","line":267,"col":16,"pos":8598}]
- src/hooks/useMediaMTX.ts — [{"name":"useMediaMTX","line":136,"col":17,"pos":3784},{"name":"default","line":301,"col":16,"pos":8604}]
- src/components/TelegramConfigPanel.tsx — [{"name":"TelegramConfigPanel","line":34,"col":17,"pos":914},{"name":"default","line":188,"col":16,"pos":6352}]
- src/components/permissions/CapabilityGrantsCard.tsx — [{"name":"CapabilityGrantsCard","line":62,"col":17,"pos":1836},{"name":"default","line":304,"col":16,"pos":11294}]
- _…e mais 62 itens (ver `raw.json`)._

## Binários não utilizados (77)

- package.json — vite-bundle-analyzer
- package.json — k6
- package.json — storybook
- package.json — i18next-parser
- package.json — semantic-release
- package.json — tsx
- scripts/check-healing-arbiter.mjs — psql
- scripts/seed-healing-ci-user.mjs — psql
- scripts/exercise-healing-loop.mjs — psql
- scripts/check-monitoring-centers.mjs — psql
- scripts/check-definer-exposure.mjs — psql
- scripts/check-rls-exposure.mjs — psql
- scripts/check-dba-privileges.mjs — psql
- scripts/check-partition-coverage.mjs — psql
- scripts/check-partition-drain.mjs — psql
- scripts/check-partition-quarantine.mjs — psql
- scripts/check-maintenance-alerts.mjs — psql
- scripts/check-maintenance-dispatch.mjs — psql
- scripts/check-maintenance-sources.mjs — psql
- scripts/check-camera-clock-skew.mjs — psql
- scripts/check-partition-backlog-trend.mjs — psql
- scripts/check-agent-healing.mjs — psql
- scripts/check-error-blame.mjs — psql
- scripts/check-blame-routing.mjs — psql
- scripts/check-capabilities.mjs — psql
- scripts/check-alarm-recurrence.mjs — psql
- scripts/check-alarm-schemes.mjs — psql
- scripts/check-armed-now.ts — psql
- scripts/check-event-admission.ts — psql
- scripts/check-admission-ledger.ts — psql
- scripts/check-favorite-views.mjs — psql
- scripts/check-device-silence.mjs — psql
- scripts/check-device-connect.mjs — psql
- scripts/check-device-enrollment.mjs — psql
- scripts/check-root-cause-correlation.mjs — psql
- scripts/check-maintenance-escalation.mjs — psql
- scripts/check-agent-restart-budget.mjs — psql
- scripts/check-relay-task-window.mjs — psql
- scripts/check-relay-verdict.mjs — psql
- scripts/check-relay-lease.mjs — psql
- scripts/check-relay-redelivery.mjs — psql
- scripts/check-ingest-endpoints.mjs — psql
- scripts/check-dwell-analytics.mjs — psql
- scripts/check-collab-network.mjs — psql
- scripts/check-collab-governance.mjs — psql
- scripts/check-collab-notifications.mjs — psql
- scripts/check-collab-notification-silence.mjs — psql
- scripts/check-collab-retention.mjs — psql
- scripts/check-retention-registry.mjs — psql
- scripts/check-collab-nav-badge.mjs — psql
- _…e mais 27 itens (ver `raw.json`)._
