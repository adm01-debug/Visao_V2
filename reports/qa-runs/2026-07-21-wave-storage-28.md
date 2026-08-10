# Onda Storage 28 — Console UI de gestão de silences

**Status:** ✅ 10/10 — 16/16 checks estruturais + 600/600 cenários (0 leaks)

## Entregas

- `src/components/admin/AlertmanagerSilencesCard.tsx` — card admin com formulário de criação (matchers dinâmicos, duração 5–1440 min, comentário obrigatório) e lista de silences ativos com botão de expirar (justificativa mín. 5 chars).
- Integração na `OperationsPage.tsx`.
- Guard-rails client-side: bloqueio visual de matcher `.*`, validação de duração e comentário antes do invoke.
- `scripts/simulate-wave-storage-28-scenarios.mjs` — 600 cenários (matchers globais, justificativas curtas/longas, durações fora do range).

## Próxima onda (29)

Histórico paginado de auditoria (`alertmanager_silences_audit`) com filtros por actor/ação.
