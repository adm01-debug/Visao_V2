

## Plano: Cobertura final de `mb-mobile-nav`

### Status atual
- `PageContent` (em `src/components/layout/MainLayout.tsx`) **já inclui `mb-mobile-nav`** → cobre automaticamente `AutomationRulesPage` e `ReportsPage`. Nenhuma alteração necessária nelas.
- 26 páginas já possuem a classe aplicada manualmente.

### Páginas que ainda precisam de auditoria/aplicação
Páginas autenticadas com chrome de app (sidebar + bottom nav) que não foram verificadas:

1. `src/pages/DashboardV2.tsx` — dashboard principal
2. `src/pages/HeatmapPage.tsx` — visualização de heatmap
3. `src/pages/AnalyticsPage.tsx` — analytics
4. `src/pages/TelegramSettingsPage.tsx` — configurações do Telegram

### Páginas excluídas intencionalmente
Não recebem `mb-mobile-nav` por design (não usam o BottomNavigation):
- `Auth.tsx`, `AuthCallback.tsx`, `ResetPasswordPage.tsx` — fluxo de login
- `Index.tsx`, `NotFound.tsx`, `AcessoNegado.tsx` — redirects/erros standalone

### Ação
Para cada uma das 4 páginas restantes:
1. Ler o arquivo para localizar o container raiz.
2. Adicionar `mb-mobile-nav` ao `className` do wrapper de mais alto nível (mesmo padrão dos outros: junto a `min-h-screen bg-background` ou `space-y-6 p-6`).
3. Não alterar lógica nem estrutura — apenas a className.

### Validação
- `npx tsc --noEmit` para confirmar build limpo.
- Confirmar via grep que todas as páginas de app autenticadas (exceto auth/erro) contêm `mb-mobile-nav`.

### Resultado esperado
100% de consistência: nenhuma página autenticada terá conteúdo escondido pela barra de navegação inferior no mobile.

