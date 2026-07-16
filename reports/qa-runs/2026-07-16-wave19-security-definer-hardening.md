# Wave 19 — Endurecimento de SECURITY DEFINER

## Resumo
Linter reduziu de **3 → 1** warnings.

### Corrigido
- `public.ensure_future_partitions(int)` — REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT EXECUTE apenas para service_role. Chamada exclusivamente pelo job cron `visao-monthly-partitions` (roda como postgres/service).

### Aceito como intencional (não corrigível sem quebrar UX admin)
- `public.get_operational_metrics()` — precisa ser chamável por `authenticated` porque o dashboard `/operations` invoca via `supabase.rpc()`. A defesa em profundidade está dentro da função:
  ```sql
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;
  ```
  Mesmo padrão de `replace_user_role` e `delete_user_data`. Não-admin recebe 403 imediato antes de qualquer leitura sensível.

## Simulação (cenários mentais)
- Anon chama `ensure_future_partitions` → **PERMISSION DENIED** (sem grant).
- Authenticated não-admin chama `ensure_future_partitions` → **PERMISSION DENIED**.
- Authenticated não-admin chama `get_operational_metrics` → **RAISE EXCEPTION 42501** dentro da função (nenhum dado retornado).
- Admin chama `get_operational_metrics` → OK.
- Cron `visao-monthly-partitions` (service_role) chama `ensure_future_partitions` → OK.

## Gates
- Backward-compat: dashboard admin funciona normalmente.
- Job cron funciona normalmente (roda como owner postgres, tem privilégios).
- Superfície de ataque reduzida: função de DDL agora inacessível pela Data API.
