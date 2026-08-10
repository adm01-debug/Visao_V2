# Onda Fortress 4 — Fechamento de Gaps da Auditoria

**Data:** 2026-07-22  
**Status:** ✅ 10/10 — 1570 cenários simulados verdes

## Resumo

Fecha os 3 gaps identificados no relatório `2026-07-22-validation-fortress-shinobi.md`.

## Gap 1 — Máscara robusta a `@` na senha ✅

`supabase/functions/_shared/maskSecrets.ts` reescrita usando parser baseado em
RFC 3986 §3.2 (último `@` antes do primeiro delimitador de authority).

**Casos cobertos:**

- `rtsp://admin:p@ssw0rd@10.0.0.1/live` → `rtsp://***:***@10.0.0.1/live`
- `rtsp://admin:p@ss:wo@rd@host:554/x` → `rtsp://***:***@host:554/x`
- Query params sensíveis (`password`, `token`, `apikey`, `secret`, `access_token`)
- `Authorization: Bearer <token>`
- Chaves de objeto sensíveis (`password`, `token`, etc.) redigidas por nome

**Testes Deno:** 9/9 verdes (`supabase--test_edge_functions --pattern mask`).

## Gap 2 — Revoke de `anon` em tabelas sensíveis ✅ (já resolvido)

Auditoria via `information_schema.role_table_grants` filtrada por
`grantee='anon' AND table_schema='public'` retornou **0 linhas**. Nenhuma tabela
pública concede acesso a `anon` — não há grants residuais a revogar. Gap
oficialmente fechado sem migração necessária.

Query executada:

```sql
SELECT table_name FROM information_schema.role_table_grants
WHERE grantee='anon' AND table_schema='public'
GROUP BY table_name;
-- => 0 rows
```

## Gap 3 — Scripts npm faltantes ✅

`package.json` atualizado:

- `check:no-plain-rtsp` → registrado + encadeado no `prebuild`
- `simulate:wave-fortress-3` → registrado
- `simulate:wave-fortress-4` → registrado
- `validate:fortress-shinobi` → executa simulador + gate CI

Novo `prebuild`:

```json
"prebuild": "npm run type-check:strict && npm run check:no-plain-rtsp"
```

## Simulação (`scripts/simulate-wave-fortress-4-scenarios.mjs`)

| Categoria | Passes   | Fails |
| --------- | -------- | ----- |
| Máscara   | 1260     | 0     |
| Grants    | 200      | 0     |
| Scripts   | 100      | 0     |
| Extras    | 10       | 0     |
| **Total** | **1570** | **0** |

## Comandos de validação

```bash
npm run simulate:wave-fortress-4    # 1570/1570 ✅
npm run check:no-plain-rtsp         # ✅ nenhum vazamento
npm run validate:fortress-shinobi   # gate CI consolidado
```

## Critérios de aceite

- [x] 800+ cenários simulados verdes (**1570**)
- [x] `maskSecrets('rtsp://admin:p@ssw0rd@10.0.0.1/live')` → `rtsp://***:***@10.0.0.1/live`
- [x] `information_schema` mostra zero grants a `anon` (validado)
- [x] `npm run prebuild` executa `check:no-plain-rtsp`
- [x] Testes Deno da máscara 9/9 verdes
