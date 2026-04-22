---
name: e2e-debug-attachments
description: Fixture testFixtures.ts coleta console/network/pageerrors automaticamente e anexa em falhas (+ screenshot + URL final). Trace muda para retain-on-failure.
type: feature
---
**Arquivo:** `tests/e2e/helpers/testFixtures.ts` — fixture `auto: true` que substitui `import { test } from '@playwright/test'`.

**Anexos automáticos em falhas:**
- `console.log` (JSON) — todas mensagens com tipo, texto, location, timestamp
- `network.log` (JSON) — URL, método, status, duração, resourceType + sumário com `errors`/`failed` count e flags `❌ FAILED` / `⚠️ 5xx` / `⚠️ 4xx`
- `pageerrors.log` (JSON) — exceções não tratadas (apenas se houver)
- `current-url.txt` — URL final (debug de redirects para /auth)
- `failure-screenshot.png` — screenshot adicional `fullPage` no estado final

**Configuração nativa do Playwright complementar (`playwright.config.ts`):**
- `screenshot: only-on-failure, fullPage`
- `video: retain-on-failure, 1280×720`
- `trace: retain-on-failure` (mudado de `on-first-retry` para capturar sempre)

**Migração:** trocar `from '@playwright/test'` → `from './helpers/testFixtures'` mantendo `expect` re-exportado.

**Specs migrados:** `smoke-pages.spec.ts`, `smoke-client-navigation.spec.ts`. Outros specs continuam funcionando com import nativo (a fixture é opt-in por arquivo).

**Por que `auto: true`:** roda transparentemente sem chamar a fixture explicitamente — basta importar o `test` correto.

**Cleanup:** listeners (`console`, `request`, `response`, `requestfailed`, `pageerror`) são removidos com `page.off` após cada teste para evitar vazamento entre workers.
