# Changelog

## [2026-11-21] - Gravacao de clips no servidor

### Added

- `useClipStorage` agora gravado: salva o clip no bucket privado `camera-clips` com path `{user_id}/{camera_id}/...` e registra em `video_clips` com status `completed`; exclusao individual/em lote remove os arquivos de storage antes de apagar a linha.
- `RecordingsPage`: as 12 URLs da pagina visivel sao re-assinadas via createSignedUrl (chave estavel anti-loop) e o player re-assina o clip ao atravessar paginas; a exclusao em lote age nos clips selecionados mesmo fora da pagina/filtro via `.in('id', ids)`.
- Testes: 14 casos em `clipStorageUrls.test.ts` + 2 de componente em `RecordingsPage.clips.test.tsx`.

## [2026-11-21] - Bitrate adaptativo no player de vídeo

### Added

- `useStreamStats`: adaptação de qualidade por `autoLevelCapping` quando o buffer fica baixo por amostras consecutivas (não fixa nível manual nem descarta buffer); recupera para auto após buffer estável (incluindo teto 0), sem oscilar entre tetos quando `currentLevel` é a variante mínima.

## [2026-11-14] - Estabilização de renderização

### Fixed

- `useFrameBuffer`: snapshot estável por câmera para o `useSyncExternalStore` — elimina o loop de render (React error #185) em /cameras

## [API-1.0.0] - 2026-07-17 — API REST Pública v1 (Ondas 43-52)

### Added

- API REST v1 estável com 13 endpoints (health, status, cameras CRUD read + arm/disarm, events + summary, alerts + acknowledge, panic, signed clip URLs)
- Filtros declarativos com whitelist anti-injeção (`?filter=campo:valor,campo:valor`)
- SDK TypeScript autogerado via `scripts/generate-api-sdk.mjs` (openapi-typescript 7)
- Utilitário HMAC-SHA256 timing-safe para webhooks v2 (`_shared/webhookHmac.ts`)
- Tabela `api_usage_logs` com RLS user-or-admin e retenção 90d (integrada ao cron `visao-daily-retention`)
- Dashboard admin `/admin/api-usage` (top endpoints, p95, error rate, volume/dia)
- Edge function `settings-backup` (export/import de config com whitelist estrita, RPC transacional `import_settings_backup`)
- Página pública `/precos` com JSON-LD Product e 3 tiers (Free/Pro/Enterprise)
- `POSTING_RULES.md` normatizando issues/PRs/branches/deprecação
- Release notes completas em `docs/api/RELEASE_NOTES_v1.0.0.md`

### Security

- IP hasheado (SHA-256 + salt) em telemetria — sem PII
- TTL máx. 7 dias em signed URLs (LGPD + custo storage)
- Rate-limit sensível (20 req/min) em `/v1/panic` e `/v1/trigger-alert`; padrão 60 req/min
- Contrato `/v1/*` congelado — mudanças breaking exigem `/v2/*` com header `Sunset`
- Whitelist estrita de campos filtráveis/ordenáveis (SQL-injection prevention)

## [2026-01-16] - Auditoria de Código

### Fixed

- Removido `console.error` de `AnalyticsComparison.tsx`
- Removido `console.error` de `FaceBlacklistManager.tsx`
- Removido `console.error` de `RealTimeStats.tsx`
- Removido `console.error` de `AuthCallback.tsx`
- Removido `console.warn` de `env.ts`

### Verified

- 0 console statements em produção (exceto DEV mode)
- 0 any types em produção
- 100% documentação presente
- Todos workflows configurados

Todas as mudanças notáveis neste projeto serão documentadas aqui.

## [3.0.0] - 2026-01-12

### Adicionado (V19-V33)

#### Componentes UI (130+)

- **Cards**: Card, StatsCard, DataCard, UserCard, ProductCard, FeatureCard, PricingCard, TestimonialCard
- **Typography**: Heading, Text
- **Forms**: FormField, TextInput, TextArea, PasswordInput, TagsInput, Autocomplete, DateInput, PhoneInput, CPFInput, CurrencyInput, MaskedInput
- **Feedback**: Alert, Toast, Skeleton, LoadingOverlay, EmptyState, ErrorState, EmptyList
- **Navigation**: Tabs, Accordion, Breadcrumb, Pagination, Stepper, TabBar, BottomNav, NavLink
- **Overlays**: Modal, Drawer, Tooltip, Dropdown, ConfirmDialog, CommandMenu
- **Media**: Avatar, AvatarGroup, ImageGallery, FileSize
- **Progress**: ProgressBar, ProgressSteps, Rating, Slider, Countdown
- **Layout**: Grid, SplitView, CenterBox, AspectRatio, PageHeader, Header, Footer, Sidebar, ActionBar
- **Data Display**: Timeline, Divider, LabelValue, Chip, Badge, StatusDot, ColorIndicator, DotIndicator
- **Social**: MessageBubble, Comment, ActivityItem, NotificationItem
- **Utility**: SearchBar, ScrollToTop, CopyButton, KeyboardShortcut, TruncateText, Highlight, CollapseText, PriceTag
- **Vigilância**: CameraCard, AlertEvent, DetectionBox, RecordingBadge, LiveStatus, VideoControls, ZoneMap

#### Hooks (35+)

- useForm, useFetch, useDebounce, useThrottle, useLocalStorage
- useToggle, useDisclosure, useToast, useMediaQuery, useKeyPress
- useWindowSize, useScrollPosition, useEventListener, useInterval
- useTimeout, usePrevious, useOnlineStatus, useAsync, useClipboard
- useCountdown, useHover, useFocus, useClickAway, useLockBodyScroll
- useScript, useTitle, useIntersectionObserver, useMediaDevices

#### Utilitários (45+)

- **Formatting**: formatCurrency, formatPhone, formatDocument, formatFileSize
- **Masks**: maskCPF, maskCNPJ, maskPhone, maskCEP, maskDate, maskCreditCard
- **Strings**: capitalize, truncate, slugify, pluralize
- **Numbers**: clamp, round, percentage, formatNumber
- **Arrays**: unique, groupBy, chunk, sortBy
- **Objects**: pick, omit, deepClone, deepMerge
- **Storage**: localStorage, sessionStorage utilities
- **Browser**: isMobile, isIOS, copyToClipboard
- **Random**: randomInt, randomColor, shuffle

### Estatísticas

- 718 commits
- 1639 arquivos TypeScript
- 1212 arquivos TSX
- 1330 testes

## [2.0.0] - 2026-01-11

### Adicionado

- Limpeza de console.log/error/warn (36 arquivos)
- Correção de any → unknown (3 arquivos)
- Workflows corrigidos (CI, lint, test)
- Documentação inicial

## [1.0.0] - 2026-01-10

### Inicial

- Setup inicial do projeto VIS-O
- Estrutura base de componentes
- Configuração de build e testes
