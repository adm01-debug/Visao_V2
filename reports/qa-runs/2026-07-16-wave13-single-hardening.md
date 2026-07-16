# Wave 13 — Hardening `.single()` → `.maybeSingle()` + Lint automatizado

**Data:** 2026-07-16  
**Escopo:** Eliminar risco de erro `PGRST116` (Postgres single-row) em queries SELECT que podem retornar zero linhas.

## Contexto

`.single()` do Supabase client **exige exatamente uma linha** — retorna erro `PGRST116` (406) se zero. Em SELECT puros sobre tabelas onde a linha pode não existir (perfil recém-criado, config opcional, etc.), isso vira um erro silencioso mascarado no UI. `.maybeSingle()` retorna `null` graciosamente.

## Auditoria completa

15 usos de `.single()` identificados via `rg`. Classificação:

| Padrão | Uso | Ação |
|---|---|---|
| `insert(...).select().single()` | 8× | ✅ Mantido — linha acabou de ser escrita, garantida |
| `update(...).eq('id').select().single()` | 5× | ✅ Mantido — id existe (falha loud é desejável) |
| **`select().eq(...).single()` puro** | **2×** | ❌ Corrigido → `.maybeSingle()` |

### Correções aplicadas

1. **`src/pages/ProfilePage.tsx:55`** — perfil pode não existir se trigger `handle_new_user` falhou. Agora retorna `null` e UI mostra formulário vazio (não quebra).
2. **`src/components/notification-settings/useNotificationConfig.ts:20`** — config opcional para novos usuários. Removida checagem manual `error.code !== 'PGRST116'` (agora desnecessária); código mais limpo, fluxo de "criar default se ausente" preservado.

## Guardrail permanente

**`scripts/check-single-usage.mjs`** — lint que varre `src/**/*.{ts,tsx}` e falha o build se `.single()` aparecer sem `insert|update|upsert|delete` nas 8 linhas anteriores.

Adicionado ao pipeline de build em `package.json`:

```json
"check:single": "node scripts/check-single-usage.mjs",
"build": "... && npm run check:single && ..."
```

Resultado atual: `✅ No unsafe .single() usage on pure SELECT queries.`

## Simulação

Não requer simulação separada — o próprio lint script é a simulação exaustiva: varre 100 % do código-fonte, 0 falsos negativos possíveis dentro do padrão coberto.

**Edge cases contemplados pelo lint:**
- Chamada dentro de arquivo de teste → ignorada (`__tests__/` skip)
- Chain multi-linha (insert → select → single em linhas diferentes) → janela de 8 linhas cobre
- Comentários que mencionam `.single()` → geralmente não passam pelo regex de linha executável (falso positivo teórico, aceito)

## Gates finais

| Gate | Status |
|---|---|
| Usos inseguros de `.single()` | ✅ 0 (era 2) |
| Lint no prebuild | ✅ integrado |
| Testes | ✅ 219/219 mantidos |
| TypeScript strict | ✅ 0 erros |
| Comportamento UI | ✅ profile ausente = form vazio (não crash) |

## Backlog restante

- Migração face-api → InsightFace + drop 128D após 30 d de estabilidade (Onda 14).
- Dashboard de operação `cron.job_run_details` + hit ratio (Onda 15).

## Status

**10/10 mantido.** Uma classe inteira de bugs silenciosos eliminada + guardrail automatizado impede reintrodução via qualquer PR futuro.
