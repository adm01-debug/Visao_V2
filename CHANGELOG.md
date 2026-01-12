# Changelog

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
