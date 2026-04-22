---
name: mobile-nav-checklist
description: mb-mobile-nav vive no MainLayout único; fallback CSS via [data-app-scroll]; allowlist para wrappers customizados; script estático + heurística + snapshot + runtime Playwright + snapshot visual + class-presence build gate + route-based audit validam (8 camadas)
type: feature
---
**Defesa em profundidade (8 camadas):**

1. **Classe explícita** `mb-mobile-nav` no `<main>` de `src/components/layout/MainLayout.tsx` (e `src/layouts/MainLayout.tsx`). Implementada como `padding-bottom: calc(4rem + safe-area-inset-bottom)` em `src/index.css`.

2. **Fallback CSS global** via atributo `data-app-scroll` no `<SwipeableView>` do layout. Regra em `src/index.css` aplica o mesmo `padding-bottom` automaticamente ao último filho (`main`/`div`/`section`) que **não** tenha `mb-mobile-nav`.

3. **Allowlist de wrappers customizados** — páginas que substituem o `<main>` do MainLayout por wrapper próprio (`min-h-screen` ou Sidebar embutido) devem reaplicar `mb-mobile-nav` explicitamente E entrar na `CUSTOM_WRAPPER_ALLOWLIST` do script. Atualmente: `DashboardV2.tsx`, `HeatmapPage.tsx`, `AnalyticsPage.tsx`, `TelegramSettingsPage.tsx`, `LicensePlatePage.tsx`, `NotificationSettingsPage.tsx`, `PPEPage.tsx`, `PeoplePage.tsx`, `RecognitionAnalyticsPage.tsx`, `RecognitionLogsPage.tsx`, `RecordingsPage.tsx`, `StreamSettingsPage.tsx`, `ZonesPage.tsx`.

4. **Script de auditoria estática** `scripts/check-mobile-nav.mjs` — encadeado em `prebuild` e CI. Valida:
   - (a) wrapper contém a classe;
   - (b) páginas padrão NÃO redeclaram `mb-mobile-nav`;
   - (c) páginas na `CUSTOM_WRAPPER_ALLOWLIST` CONTÊM `mb-mobile-nav`;
   - (d) nenhuma página usa `h-[calc(100vh-...)]` (scroll duplo);
   - (e) **heurística**: páginas com `min-h-screen` / `h-screen` / `h-dvh` / `<Sidebar` que não estão cadastradas falham com mensagem clara;
   - (f) **snapshot** `scripts/.mobile-nav-snapshot.json` registra `standard | customWrapper | standalone` por página — novos arquivos sem entry quebram o build. Regenere com `npm run check:mobile-nav -- --snapshot`.

5. **Runtime Playwright** `tests/e2e/mobile-nav-padding.spec.ts` — viewport iPhone 12, itera ~15 rotas autenticadas e mede `paddingBottom` real do último filho de `[data-app-scroll]`, exigindo ≥ 64px. Rodado no CI via `npm run test:mobile-nav-runtime`. Usa o helper `gotoAuthenticated` (`tests/e2e/helpers/authSession.ts`) que tenta autenticar via storage state ou login REST programático antes de fazer skip controlado.

6. **Snapshot visual de sobreposição multi-viewport** `tests/e2e/mobile-nav-overlap.spec.ts` — para `/dashboard`, `/heatmap`, `/analytics` em **3 viewports** (`android-360` 360x740, `iphone-390` 390x844, `iphone-414` 414x896): scrolla até o fim, usa o helper `findLastRealElement` (descarta skeletons/placeholders/elementos invisíveis) para asserir `bottom <= viewportHeight - 60` e captura screenshot da faixa inferior (170px) — baseline por viewport (`${page}-${viewport}-bottom.png`) com `maxDiffPixelRatio: 0.05`. Total: 9 combinações página × viewport. Usa `gotoAuthenticated` para auth/skip. Atualizar baselines com `--update-snapshots`.

7. **Build gate de presença de classe no DOM** `tests/e2e/mobile-nav-class-presence.spec.ts` — itera 21 rotas autenticadas em viewport iPhone 12 e exige que EXISTA pelo menos um elemento descendente de `[data-app-scroll]` cuja `class` contenha LITERALMENTE `mb-mobile-nav`. Usa `ensureAuthenticatedContext` antes da navegação para tentar autenticar automaticamente; se falhar e a rota redirecionar, respeita `MOBILE_NAV_CLASS_AUTH_BYPASS=1` para skip controlado — sem a env var, qualquer redirect para /auth FALHA o build. Configurar `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` em CI para cobertura runtime completa (ver mem://testing/e2e-auth-session-helper).



8. **Auditoria route-based** (parte do `scripts/check-mobile-nav.mjs`) — extrai dinamicamente todas as rotas envolvidas em `<ProtectedLayoutRoute>` dentro de `src/App.tsx` (atualmente 32 rotas), resolve `<ComponentName />` → import lazy → arquivo de página, e valida que cada arquivo cumpre o contrato `mb-mobile-nav`: páginas padrão NÃO redeclaram (vem do MainLayout), wrappers customizados reaplicam explicitamente. Garante que NENHUMA rota autenticada fica de fora da auditoria — mesmo que o snapshot esteja desatualizado ou um arquivo de página seja referenciado por path não-óbvio. Relatório no console lista `rota → componente → arquivo → motivo`. Falha o build via exit code 1.

**MainLayout usa `h-screen h-[100dvh]`** — `dvh` sobrescreve `vh` em browsers compatíveis, evitando overflow no iOS Safari.

**SwipeableView** propaga `data-app-scroll` via `...rest` em ambos os branches (mobile com motion.div e desktop com div simples).

**Anti-padrões proibidos em páginas padrão:**
1. Redeclarar `mb-mobile-nav` (causa dupla margem) — exceto em `CUSTOM_WRAPPER_ALLOWLIST`
2. Usar `h-[calc(100vh-4rem)] overflow-auto` no container raiz (scroll duplo, quebra momentum iOS)
3. Criar wrapper raiz com `min-h-screen`/`h-screen`/`h-dvh` sem cadastrar na allowlist (heurística do script bloqueia)

**Allowlist standalone (fora do MainLayout — NÃO renderizam BottomNavigation, logo NÃO precisam de `mb-mobile-nav`):**

| Página | Rota | Motivo |
|---|---|---|
| `AuthPage.tsx` / `Auth.tsx` | `/auth` | Login/signup pré-autenticação; layout centralizado próprio |
| `AuthCallback.tsx` | `/auth/callback` | Handler OAuth (apenas spinner) |
| `ResetPasswordPage.tsx` | `/reset-password` | Recuperação de senha via link de e-mail |
| `NotFound.tsx` | `*` (404) | Erro genérico, pode aparecer fora de auth |
| `Index.tsx` | `/` | Apenas redireciona; renderiza SplashScreen |
| `AcessoNegado.tsx` | `/acesso-negado` | Bloqueio RBAC/IP whitelist |

Documentação completa em `docs/LAYOUTS.md` §11 — Camada 0. Se uma dessas páginas migrar para `MainLayout`, remover a entry da `ALLOWLIST` (heurística da Camada 4 detectará o wrapper).
