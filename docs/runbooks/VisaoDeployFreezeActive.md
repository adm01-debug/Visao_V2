# Runbook — VisaoDeployFreezeActive

**Severidade:** 🔴 critical · **Time:** SRE · **SLA de resposta:** 15 min

## Sintomas

- Pipeline CI/CD falha no job `slo/deploy-freeze` com "🚫 DEPLOY BLOQUEADO".
- Alerta `VisaoDeployFreezeActive` disparado no Alertmanager.
- Dashboard SLO mostra `visao:deploy_freeze:active == 1`.

## Causa

Uma das condições foi satisfeita por ≥ 2 min:

1. `visao:budget_exhausted_50pct:any == 1` — algum SLO consumiu > 50% do error budget (30d ou 7d).
2. `visao:fast_burn_active:any == 1` — fast burn (≥ 14.4x) em janela curta E longa simultaneamente.

## Diagnóstico (copy-paste)

```promql
# Qual SLO está esgotando o budget?
slo:error_budget_burned:metrics_30d
slo:error_budget_burned:app_30d
slo:error_budget_burned:tiering_7d

# Fast burn ativo?
(1 - slo:probe_success_ratio:metrics_5m) / (1 - slo:target:metrics)
(1 - slo:probe_success_ratio:app_5m)     / (1 - slo:target:app)
(1 - slo:tiering_success_ratio:5m)       / (1 - slo:target:tiering)
```

```bash
# Reproduzir localmente
export PROMETHEUS_URL=https://prom.internal
export PROMETHEUS_TOKEN=$(vault read -field=token secret/visao/prom)
node scripts/ci/check-deploy-freeze.mjs
```

## Mitigação

1. **Não aplique bypass sem investigar.** O freeze existe para proteger o usuário.
2. Identifique o SLO afetado no dashboard `visao-slo`.
3. Consulte runbook do burn correspondente:
   - Fast burn → [`VisaoSloFastBurn.md`](./VisaoSloFastBurn.md)
   - Slow burn / budget baixo → [`VisaoSloSlowBurn.md`](./VisaoSloSlowBurn.md)
4. Se o serviço estabilizou (fast burn retornou a < 1x por ≥ 30m), o freeze libera sozinho.

## Bypass emergencial (uso auditado)

Aplique **apenas** para hotfixes que corrijam o próprio incidente:

- **GitHub PR:** adicione a label `deploy-freeze-override`.
- **Local/CLI:** `BYPASS_DEPLOY_FREEZE=true node scripts/ci/check-deploy-freeze.mjs`.

Cada bypass gera log estruturado com `actor` — revisão obrigatória no post-mortem.

## Pós-incidente

- [ ] Registrar linha do tempo no post-mortem.
- [ ] Confirmar retorno do budget (>= 30% disponível) antes de reabrir deploys automáticos.
- [ ] Se bypass foi usado, anexar justificativa e resultado do hotfix.
- [ ] Revisar thresholds (50% budget / 14.4x burn) se o incidente indicar calibração ruim.

## Escalonamento

- Não resolvido em 30 min → acionar líder SRE via `#visao-oncall`.
- Impacto de negócio confirmado → comunicar stakeholders via canal `#visao-status`.
