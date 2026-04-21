

## Reaplicar `mb-mobile-nav` em 4 páginas com wrapper customizado

Essas 4 páginas usam wrapper raiz próprio (não delegam ao `<main>` do `MainLayout`), então o fallback CSS cobre — mas adicionar a classe explícita garante consistência declarativa, evita depender do seletor `:last-child` e mantém o padrão visível ao ler o código da página.

### Mudança

Adicionar `mb-mobile-nav` ao container raiz de cada página:

- **`src/pages/DashboardV2.tsx`** — `<div className="page-container space-y-4 sm:space-y-6">` → adicionar `mb-mobile-nav`
- **`src/pages/HeatmapPage.tsx`** — `<div ... className="min-h-screen bg-background">` → adicionar `mb-mobile-nav`
- **`src/pages/AnalyticsPage.tsx`** — adicionar ao container raiz
- **`src/pages/TelegramSettingsPage.tsx`** — adicionar ao container raiz

### Ajuste no script de auditoria

`scripts/check-mobile-nav.mjs` hoje **proíbe** `mb-mobile-nav` em páginas (regra "wrapper-only"). Precisa relaxar para permitir reaplicação intencional em páginas com wrapper customizado:

- Criar uma `CUSTOM_WRAPPER_ALLOWLIST` no script com essas 4 páginas
- Para arquivos nessa lista, validar que a classe **está presente** (em vez de proibida)
- Demais páginas continuam proibidas de redeclarar (delegam ao `MainLayout`)

### Documentação e memória

- `docs/LAYOUTS.md` seção 11: documentar que páginas com wrapper customizado (ex.: `min-h-screen` próprio) devem reaplicar a classe + entrar na allowlist
- `mem://standards/mobile-nav-checklist`: atualizar com a 4ª camada (allowlist de wrappers customizados)

### Validação

1. `npm run check:mobile-nav` — deve passar com nova lógica diferenciada
2. Inspeção DOM no preview: confirmar `mb-mobile-nav` presente nos 4 wrappers e padding inferior aplicado em viewport mobile

### Arquivos editados

- ✏️ `src/pages/DashboardV2.tsx`, `HeatmapPage.tsx`, `AnalyticsPage.tsx`, `TelegramSettingsPage.tsx` (adicionar classe)
- ✏️ `scripts/check-mobile-nav.mjs` (allowlist de wrappers customizados)
- ✏️ `docs/LAYOUTS.md` (seção 11)
- ✏️ `.lovable/memory/standards/mobile-nav-checklist.md`

