

## Centralizar `mb-mobile-nav` no wrapper único de layout

Hoje a classe `mb-mobile-nav` está espalhada por 29 páginas individualmente. Vamos movê-la para um único local — o `<main>` do `MainLayout` — e remover de todas as páginas, mantendo o script de checagem como rede de segurança (agora validando o wrapper, não a string em cada página).

### Mudança central

**`src/components/layout/MainLayout.tsx`** — adicionar `pb-mobile-nav` (ou manter `mb-mobile-nav`) diretamente no `<main>`:

```tsx
<main
  id="main-content"
  className="p-4 md:p-6 pb-20 md:pb-6 mb-mobile-nav min-h-full"
  role="main"
  aria-label="Conteúdo principal"
>
```

Como **todas as rotas autenticadas passam por `ProtectedLayoutRoute` → `MainLayout`**, isso cobre 100% das páginas roteadas de uma só vez. Páginas standalone (Auth, NotFound, Index, AcessoNegado) continuam isentas naturalmente — não passam pelo MainLayout.

> Observação: já existe `pb-20 md:pb-6` no `<main>`. Vamos consolidar deixando `mb-mobile-nav` como fonte única (definida no Tailwind config) e remover o `pb-20 md:pb-6` redundante para evitar dupla margem.

### Limpeza nas páginas (29 arquivos)

Remover ocorrências de `mb-mobile-nav` (e variantes como `mb-mobile-nav p-6`) do container raiz de cada página. Lista derivada do output atual do script:

`SettingsPage`, `JourneyReportsPage`, `LicensePlatePage`, `NotificationSettingsPage`, `Dashboard`, `CamerasPage`, `AlertsPage`, `RulesPage`, `UsersPage`, `ProductivityPage`, `GoalsAlertsPage`, `CollaboratorFlowPage`, `PanicEventsPage`, `BehaviorDetectionPage`, `FaceRecognitionPage`, `HeatmapPage`, `RecordingsPage`, `ReportsPage`, `AutomationPage`, `IntegrationsPage`, `TelemetryPage`, `AuditLogsPage`, `BlacklistPage`, `ZonesPage`, `ProfilePage`, `OnboardingPage`, `EmergencyPage`, `AnalyticsPage`, `NotificationsPage` *(nomes finais conferidos no diretório antes da edição)*.

Edição mecânica: remover apenas o token `mb-mobile-nav` da string `className`, preservando todo o resto. Sem mudança de estrutura.

### Atualizar o script de checagem

**`scripts/check-mobile-nav.mjs`** — inverter a lógica: agora ele valida que **nenhuma página redeclara** `mb-mobile-nav` (evita drift futuro), e confirma que `MainLayout.tsx` contém a classe.

Nova saída:
```
📐 Mobile Nav Checklist (wrapper-based)
✅ MainLayout aplica mb-mobile-nav globalmente
✅ 29 páginas limpas (sem duplicação)
⊘  6 páginas isentas
```

Falha se:
- `MainLayout.tsx` perder a classe → quebra layout global
- Alguma página voltar a declarar `mb-mobile-nav` localmente → drift

A allowlist e o hook em `prebuild`/CI permanecem.

### Atualizar documentação e memória

- **`docs/LAYOUTS.md`** seção 11: reescrever explicando que a classe vive no wrapper, não nas páginas.
- **`mem://style/mobile-layout-compatibility`** e **`mem://standards/mobile-nav-checklist`**: atualizar para refletir nova regra "wrapper único".
- **`mem://index.md`** Core: trocar a linha "routed pages must include `mb-mobile-nav`" por "MainLayout aplica `mb-mobile-nav` globalmente; páginas não devem redeclarar".

### Validação

1. `npm run check:mobile-nav` — deve passar com nova lógica
2. `npx tsc --noEmit` — sem erros de tipo
3. Inspeção visual rápida via DOM: confirmar que `<main>` tem `mb-mobile-nav` e nenhuma página filha duplica

### Arquivos editados

- ✏️ `src/components/layout/MainLayout.tsx` (adicionar classe ao `<main>`)
- ✏️ 29 páginas em `src/pages/*.tsx` (remover token `mb-mobile-nav`)
- ✏️ `scripts/check-mobile-nav.mjs` (lógica invertida)
- ✏️ `docs/LAYOUTS.md` (seção 11 reescrita)
- ✏️ `.lovable/memory/index.md` + 2 arquivos de memória atualizados

### Riscos e mitigação

- **Risco:** alguma página com layout próprio (sem usar `<main>` do MainLayout, ex: cria seu próprio scroll container) pode perder a margem.
  - **Mitigação:** após remoção, abrir as páginas suspeitas que tinham `min-h-screen` próprio (`SettingsPage`, `LicensePlatePage`, `NotificationSettingsPage`, `JourneyReportsPage`) e validar visualmente em mobile. Se quebrar, manter `mb-mobile-nav` no container interno dessas exceções e adicionar à `COMPLIANT_WRAPPERS` do script.

