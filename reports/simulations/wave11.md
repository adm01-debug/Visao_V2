# Wave 11 Simulation — Dedicated edge_cache + telemetry

- Total: **300**
- Unsafe: **0**
- Telemetry hits: 10 | misses: 15

## By category

- `ttl_per_namespace_encode_24h`: 18
- `ttl_per_namespace_detect_1h`: 17
- `ttl_per_namespace_liveness_15m`: 6
- `rls_denies_client_read`: 14
- `rls_denies_client_write`: 19
- `service_role_bypasses_rls`: 17
- `cleanup_job_purges_expired`: 20
- `cleanup_job_keeps_fresh`: 10
- `telemetry_records_hit`: 10
- `telemetry_records_miss`: 15
- `concurrent_upsert_no_dup`: 10
- `namespace_collision_impossible`: 12
- `sha256_deterministic`: 11
- `sha256_diff_input_diff_key`: 20
- `ttl_zero_never_caches`: 28
- `cache_size_cap_10k_rows`: 14
- `migration_backfill_from_idempotency`: 15
- `null_response_not_cached`: 14
- `oversized_payload_rejected_1mb`: 12
- `expired_row_returns_null`: 18
