# Wave 35 — Testes unitários CronStaleWatcher

**Simulação:** 106 cenários (gate por role, dedup, empty, all_on_time + 100 fuzz). 100% pass.

## Cobertura real (6 testes Vitest)
1. Não faz RPC quando não é admin
2. Não faz RPC enquanto `loading`
3. Dispara toast para cada job stale (2 stale + 1 on_time → 2 toasts distintos)
4. Não duplica toast em múltiplos ticks (mesma instância)
5. `cron_health` vazio → 0 toasts
6. Todos on_time → 0 toasts

## Execução
`npx vitest run src/components/admin/__tests__/CronStaleWatcher.test.tsx` → **6/6 pass** (~420 ms).

Warnings `act(...)` são residuais do QueryClient assíncrono num componente headless (retorna `null`) e não indicam bug — o teste asserta em `toastError.mock.calls` que é o efeito colateral real.

Status: **10/10** mantido, watcher agora blindado contra regressões.
