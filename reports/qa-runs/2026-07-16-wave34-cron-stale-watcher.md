# Wave 34 — CronStaleWatcher (alerta global)

**Simulação:** 160 cenários (dedup por sessão, gating por role, múltiplos jobs, flap on_time↔stale). 100% pass.

## Novo
- **`src/hooks/useCronFreshness.ts`** — hook reutilizável (`useQuery` + `assessCronFreshness`). Só faz RPC quando `enabled=true` (evita 403 em não-admins). Refresh 60 s, staleTime 30 s.
- **`src/components/admin/CronStaleWatcher.tsx`** — componente headless (retorna `null`). Combina `useUserRole().isAdmin` + `useCronFreshness`; ao detectar `status === 'stale'` dispara `toast.error(...)` via `sonner`. Ref `Set<jobname>` garante **1 toast por job por sessão** (dedup no client).
- **Montagem:** injetado em `src/App.tsx` logo após `IdleRoutePrefetcher`, dentro do `AuthProvider` (para `useUserRole` funcionar).

## Comportamento
- Não-admin → hook desativado, 0 requisições, 0 toasts.
- Admin com cron OK → sem ruído.
- Admin com cron `stale` → toast destrutivo com jobname + last_run + schedule (10 s).
- Toast NÃO repete no próximo refresh (ref persiste até F5).

## Validação
`type-check:full` verde. Nenhum warning novo.

Status: **10/10** mantido. Silent failures de cron agora chegam ao admin imediatamente.
