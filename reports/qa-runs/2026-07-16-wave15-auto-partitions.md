# Wave 15 — Auto-partition Management

## Resumo
- Função `public.ensure_future_partitions(months_ahead int)` criada como SECURITY DEFINER, EXECUTE restrito a `service_role`.
- Job `visao-monthly-partitions` agendado via `pg_cron` (dia 1 às 02:00 UTC) garantindo 3 meses de partições à frente para `recognition_logs` e `plate_detections`.
- Execução imediata criou/garantiu 8 partições (Jul→Out 2026).

## Simulação
- 243 cenários, 0 unsafe (2 tabelas × 5 horizontes × 24 offsets mensais + rollover de ano + concorrência + parent ausente).

## Gates
- Idempotência: `CREATE TABLE IF NOT EXISTS` + `GRANT` repetíveis.
- Segurança: `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO service_role`. Warnings do linter são falsos positivos do mesmo padrão de `replace_user_role` (proteção real via ausência de grant para anon/authenticated).
- Observabilidade: retorno `jsonb` com lista de partições garantidas e timestamp.

## Impacto
- Elimina risco de erro `no partition of relation ... found for row` que surgiria em Fev/2027 quando a última partição pré-criada (`m2027_01`) fosse ultrapassada.
- Zero manutenção manual até que a política de particionamento mude.
