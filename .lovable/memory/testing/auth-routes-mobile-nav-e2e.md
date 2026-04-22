---
name: Auth Routes & Mobile Nav E2E
description: Suíte tests/e2e/auth-routes-mobile-nav.spec.ts cobre as 12 rotas autenticadas em desktop+mobile e valida BottomNav, padding mb-mobile-nav e estado do drawer
type: feature
---

# Auth Routes & Mobile Nav E2E

Suíte abrangente que protege contra regressões nas 12 rotas autenticadas do app.

**Arquivo:** `tests/e2e/auth-routes-mobile-nav.spec.ts`
**Comando:** `npm run test:auth-routes-mobile-nav`

## Cobertura (3 sub-suítes, 25 testes)

### 1. Desktop (1280×720) — 12 testes
Para cada rota: layout autenticado montado, H1 correto, sem ErrorBoundary, console limpo, sem 5xx, e BottomNav **ausente** (md:hidden).

### 2. Mobile iPhone 12 (390×844) — 12 testes
Tudo da suite desktop **+** validações mobile:
- BottomNav visível e `position: fixed` ancorada no rodapé (rect.bottom ≈ vh)
- `<main>` com `padding-bottom + margin-bottom ≥ 56px` (token `mb-mobile-nav`)
- Último elemento interativo do `<main>` NÃO sob a BottomNav (overlap ≤ 4px)

### 3. Drawer state — 1 teste integrado
- Tap em categoria ativa abre o drawer
- Tap em backdrop fecha o drawer
- Navegar para outra rota reseta o estado do drawer (não persiste)
- BottomNav permanece visível após navegação

## Rotas cobertas (sincronizadas com `docs/qa-checklist-template.md` §1)

`/dashboard`, `/cameras`, `/alerts`, `/heatmap`, `/analytics`, `/recordings`,
`/people`, `/license-plate`, `/settings`, `/users`, `/notification-settings`, `/zones`

## Skip controlado

Sem credenciais `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`, os testes fazem skip via
`gotoAuthenticated`. Para CI obrigatório: `E2E_AUTH_REQUIRED=1`.

## Por que existe

Garante que mudanças recentes (gates `mb-mobile-nav`, allowlist standalone,
refatoração do `BottomNavigation`) não quebrem nenhuma rota — substituindo
parte do QA manual repetitivo.
