---
name: Multimonitor destacado
description: Onda 189 — janela de segundo monitor por câmera; uma câmera nunca abre duas janelas, batida de ponto renova e nunca rebaixa, teto é recusa declarada
type: feature
---
Rota standalone `/monitor/:cameraId` (protegida, sem sidebar — está na `STANDALONE_ALLOWLIST` de `check-page-content`). Abertura pelo botão "Destacar" nas células de `/visualizacoes`.

Regra única em `src/lib/views/detachedMonitor.ts` (pura, sem tocar no navegador):
- **Uma câmera, uma janela**: pedido repetido FOCA a existente; abrir a segunda duplicaria o consumo de stream do gravador.
- **Silêncio não é morte imediata**: janela só é perdida após `HEARTBEAT_TIMEOUT_MS` (15s) sem batida; batida renova e **nunca rebaixa** `lastHeartbeatAt`.
- **Batida de janela órfã é ignorada** (nome ≠ titular) — órfã não sequestra o registro vigente.
- **Relógio para trás nunca mata janela** (`heartbeatAge` faz clamp em 0).
- **Teto de 6 janelas é recusa declarada**, jamais despejo de janela viva nem fila silenciosa. Vaga só surge por morte/fechamento.
- **Fechar é idempotente**; fechar desconhecida é inerte (retorna o mesmo objeto).
- **Pop-up bloqueado não entra no livro**: janela que nunca abriu não pode ocupar vaga.

Transporte: `BroadcastChannel('visao:detached-monitors')` com `heartbeat` / `closed` / `close-request`. A janela destacada carrega a câmera pela RLS do usuário — nada sensível trafega na URL.

Validação: `npm run simulate:wave189` (837.642 asserções) + `src/__tests__/lib/detachedMonitor.test.ts`.
