# Wave 12 Simulation — pg_cron retention

- Total: **250**
- Unsafe: **0**

- `cron_runs_daily_at_0330`: 16
- `cron_survives_restart`: 17
- `cron_job_owned_by_postgres`: 8
- `sql_function_no_http_no_secrets_leak`: 17
- `idempotent_delete_no_dup_error`: 11
- `audit_logs_bypass_via_replication_role`: 9
- `audit_high_severity_immortal`: 12
- `edge_cache_expired_purged`: 5
- `telemetry_30d_retention`: 17
- `idempotency_7d_retention`: 9
- `concurrent_run_safe_via_advisory_lock_optional`: 12
- `cron_job_visible_only_to_postgres`: 11
- `no_pgnet_needed_pure_sql`: 17
- `timezone_utc_deterministic`: 12
- `unschedule_idempotent`: 18
- `failure_isolated_per_delete`: 10
- `return_jsonb_observability`: 14
- `permission_denied_for_anon`: 11
- `permission_denied_for_authenticated`: 11
- `catch_up_missed_run_ok`: 13
