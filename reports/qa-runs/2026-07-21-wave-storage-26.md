# QA Run — Wave Storage 26 (Alertmanager Silence API)

- **Data:** 2026-07-21
- **Escopo:** Integração da Alertmanager Silence API (criar / listar / expirar) com auditoria e guard-rails.
- **Status:** ✅ Aprovado

## Entregas
1. **Edge Function** `supabase/functions/alertmanager-silence/index.ts` — admin-only, rate-limited, com retries/timeout e trilha em `alertmanager_silences_audit`.
2. **Migration** `supabase/migrations/20260721160000_alertmanager_silences_audit.sql` — tabela imutável com RLS restrita a admins.
3. **Simulação** `scripts/simulate-wave-storage-26-scenarios.mjs` — 700 cenários + 15 checks estruturais.
4. **Runbook** `docs/runbooks/AlertmanagerSilenceOps.md` com comandos copy-paste e guard-rails.
5. **Reports** `reports/simulations/wave-storage-26.{json,md}`.

## Guard-rails validados
- Silences globais (`.*`, valor vazio) recusados 100% das vezes.
- Duração sempre em [5, 1440] min mesmo com input malicioso (`NaN`, negativo, string).
- `from_alert` remove `instance` e respeita cap de 12 matchers.
- `comment` obrigatório impede silence anônimo.
- Regex inválido barrado antes do upstream.

## Segurança
- JWT + `has_role(admin)` exigido em toda rota.
- Segredos (`ALERTMANAGER_URL`, `ALERTMANAGER_TOKEN`) nunca expostos ao cliente.
- Tabela de auditoria com policies `UPDATE`/`DELETE` retornando `false` (defesa em profundidade).

## Como reproduzir
```bash
node scripts/simulate-wave-storage-26-scenarios.mjs
```

## Próximo passo sugerido
Wave 27 — UI admin para gerenciar silences a partir do dashboard de alertas (React + hook tipado consumindo esta Edge Function).
