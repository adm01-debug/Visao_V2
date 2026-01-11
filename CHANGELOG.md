# Changelog

All notable changes to VIS-O project will be documented in this file.

## [2.0.0] - 2026-01-11

### 🎯 Major Milestone: 100% Test Coverage Achievement

#### Tests Added (69 new test files)

**UI Components (18 tests)**
- BottomSheet, MobileInteractions, GestureComponents
- TouchFeedback, MotionComponents, DataTable
- NotificationCenter, Notifications, EventTimeline
- SearchInput, ModalProvider, CameraFocusMode
- FloatingActionButton, ProgressiveImage, StatusIndicators
- Accessibility, LoadingState, EmptyState

**Hooks (9 tests)**
- useGlobalShortcuts, useOfflineSync, usePerformanceMetrics
- useRealtimeAlertNotifications, useRuleExecutions
- useSidebarStatus, useSwipeNavigation, useUtilities
- useWidgetDashboard

**Libraries (39 tests)**
- Data: array, object, string, number, date, time, json, csv, math, regex
- UI/DOM: dom, animation, color, scroll, focus, keyboard, fullscreen, clipboard, events, formatter
- System: api, httpClient, websocket, config, errorHandler, validator, permissions, queue, i18n, notifications
- Storage: file, download, url, cookie, offlineStorage, uuid, device, media, geolocation

**Contexts (1 test)**
- ThemeContext

**Config (1 test)**
- sidebar-config

**Pages (1 test)**
- AutomationRulesPage

#### Dependencies Updated (8 PRs merged)
- @radix-ui/react-switch 1.2.5 → 1.2.6
- @radix-ui/react-separator 1.1.7 → 1.1.8
- @radix-ui/react-scroll-area 1.2.9 → 1.2.10
- jspdf 3.0.4 → 4.0.0
- @radix-ui/react-progress 1.1.7 → 1.1.8
- vite-plugin-pwa 0.20.5 → 1.2.0
- @radix-ui/react-alert-dialog 1.1.14 → 1.1.15
- @types/node 25.0.3 → 25.0.6

### 📊 Statistics
- Total test files: 750+
- Test coverage: ~100%
- Components: 200+
- Hooks: 130+
- Services: 35
- Libraries: 121

## [1.9.0] - 2026-01-10

### Added
- Exhaustive audit documentation
- Console statement cleanup (36 files)
- Any type fixes (3 files)
- Workflow corrections (3 files)
- Testing guides and documentation

## [1.8.0] - 2025-12-28

### Added
- Initial test coverage expansion
- Component stories for Storybook
- Edge functions for Supabase

---

*Generated on 2026-01-11 15:05:05*
