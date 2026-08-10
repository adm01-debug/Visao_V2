# Wave Storage 26 — Simulation Report

- Structural checks: **17/17**
- Scenarios executed: **700**
- Misfires: **0**
- Derived-matcher failures: **0**
- Timestamp: 2026-07-21T18:18:14.081Z

## Invariants validated

1. Silences que casariam com todos alertas (`.*`, vazio) são recusados.
2. Duração é sempre clamped em [5, 1440] minutos.
3. Máx. 12 matchers por silence.
4. `from_alert` nunca inclui `instance` (evita silence excessivamente estreito por host).
5. Regex inválida é rejeitada antes de chegar ao Alertmanager.
6. Nomes de label seguem `[a-zA-Z_][a-zA-Z0-9_]{0,63}`.
