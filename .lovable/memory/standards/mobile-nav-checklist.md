---
name: mobile-nav-checklist
description: mb-mobile-nav vive no MainLayout único; fallback CSS via [data-app-scroll]; allowlist para wrappers customizados; script estático + heurística + snapshot + runtime Playwright + snapshot visual validam (6 camadas)
type: feature
---
**Defesa em profundidade (6 camadas):**

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

5. **Runtime Playwright** `tests/e2e/mobile-nav-padding.spec.ts` — viewport iPhone 12, itera ~15 rotas autenticadas e mede `paddingBottom` real do último filho de `[data-app-scroll]`, exigindo ≥ 64px. Rodado no CI via `npm run test:mobile-nav-runtime`. Rotas que redirecionam para `/auth` (sem credenciais seedadas) são marcadas como `skipped` — a checagem estática + snapshot já garantem cobertura nesses casos.

6. **Snapshot visual de sobreposição** `tests/e2e/mobile-nav-overlap.spec.ts` — para `/dashboard`, `/heatmap`, `/analytics` em viewport iPhone 12: scrolla até o fim, mede `getBoundingClientRect()` do último elemento dentro de `[data-app-scroll]` (deve ter `bottom <= viewportHeight - 60`) e captura screenshot da faixa inferior (170px) comparado contra baseline com `maxDiffPixelRatio: 0.05`. Rodado no CI via `npm run test:mobile-nav-overlap` (passo `continue-on-error: true` até baselines existirem). Atualizar baselines com `--update-snapshots`.

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
