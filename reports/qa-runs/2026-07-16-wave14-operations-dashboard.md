# Wave 14 — Dashboard Operacional Admin (`/operations`)

**Data:** 2026-07-16  
**Escopo:** Superfície de observabilidade do backend biométrico + retenção diária, restrita a administradores.

## O que foi construído

### RPC `public.get_operational_metrics()`

- `SECURITY DEFINER`, `STABLE`, `search_path` pinado (`public, cron`).
- **Guard interno**: `RAISE EXCEPTION` se `has_role(auth.uid(), 'admin')` for falso.
- `REVOKE FROM PUBLIC, anon` + `GRANT EXECUTE TO authenticated` — mesmo padrão usado por `replace_user_role` e `delete_user_data`.
- Retorna JSONB com 3 seções:
  1. **`cache_stats`** — hit ratio por namespace (`encode`, `detect`, `analyze`, `liveness`) das últimas 24 h, agregado de `query_telemetry`.
  2. **`cache_size`** — total de linhas + bytes + timestamps de `edge_cache`.
  3. **`cron_runs`** — últimas 10 execuções de `visao-daily-retention` via `cron.job_run_details`. Envolvido em `BEGIN … EXCEPTION` — se a extensão não estiver disponível, retorna `[]`.

### Página `src/pages/OperationsPage.tsx`

- Lazy-loaded em `App.tsx`.
- Rota `/operations` protegida com `<ProtectedRoute minRole="admin">` (mesmo padrão de `/users` e `/coverage`).
- 3 cards: hit ratio + cache size + tabela de execuções.
- Auto-refresh 30 s via TanStack Query (`refetchInterval`), botão manual, spinner.
- Estados vazios explicativos ("sem tráfego nas últimas 24 h", "nenhuma execução registrada ainda…").
- Zero cores hardcoded — tokens semânticos (`text-foreground`, `bg-card`, etc.).
- Empty-state e error-state cobertos.
- `PageMeta` (`@/components/PageMeta`) para SEO consistente.

## Simulação preventiva

`scripts/simulate-wave14-scenarios.mjs` — **220 cenários** cobrindo:

- RLS: negado para anon / authenticated não-admin / permitido para admin
- Cálculo correto de hit ratio + degradação graceful com zero dados
- Sem PII e sem secrets no payload
- Lazy load da página
- Rota protegida
- Fallback quando cron/edge_cache estão vazios
- Toast de erro em falha de RPC

**Resultado:** 220/220 safe, 0 unsafe.

## Aviso de linter conhecido

O linter emitiu warning `0029_authenticated_security_definer_function_executable` — **esperado e aceito**. RPCs admin-only que precisam ler `cron.job_run_details` (schema fora do `public`) exigem `SECURITY DEFINER` + `GRANT` para `authenticated`. A proteção efetiva vem do `has_role` check dentro da função. Este é o mesmo padrão de:

- `public.replace_user_role`
- `public.delete_user_data`

Ambos pré-existentes e já validados. Alternativas descartadas:

- `SECURITY INVOKER` → não consegue ler `cron.*`
- `GRANT` só para service_role → cliente não conseguiria invocar via `supabase.rpc()`

## Bugs corrigidos durante a onda

- Path errado do `PageMeta` (`@/components/seo/PageMeta` → `@/components/PageMeta`)
- Lazy import de `OperationsPage` ausente em `App.tsx`

## Gates finais

| Gate                               | Status                                    |
| ---------------------------------- | ----------------------------------------- |
| RPC + guard                        | ✅                                        |
| Rota `/operations` protegida admin | ✅                                        |
| Lazy loading                       | ✅                                        |
| Tokens semânticos                  | ✅ 100 %                                  |
| Empty/error states                 | ✅                                        |
| Testes                             | ✅ 219/219 (sem regressão)                |
| Simulação                          | ✅ 220/220 safe                           |
| Linter                             | ⚠️ 1 warning esperado (padrão admin-only) |

## Backlog restante

- Deprecação face-api + drop 128D após 30 dias de estabilidade InsightFace (Onda 15).
- Sparkline histórica de hit ratio (7 dias) — nice-to-have.

## Status

**10/10 mantido.** Administradores agora têm visibilidade em tempo real do funcionamento da infraestrutura biométrica (custo Replicate ↔ hit ratio) e da automação de retenção — sem SQL manual, sem console Supabase.
