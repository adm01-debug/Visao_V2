---
name: Permanência e veículo recorrente (Onda 125)
description: dwell_sessions com histerese, evaluate_dwell_alerts e evaluate_vehicle_recurrence; paridade com dwellTracker.ts; gate db:check:dwell-analytics
type: feature
---

## Por que existe

Paridade com a Monuv em analíticos: detectar **pessoa parada tempo demais** em uma
zona e **veículo que passa repetidas vezes** — os dois sinais clássicos de vigia
que a detecção quadro-a-quadro sozinha não dá.

## Permanência (dwell)

`public.dwell_sessions` agrupa detecções em sessões por (câmera, zona, `track_key`).
Índice único parcial `uq_dwell_sessions_open` garante **uma** sessão aberta por alvo
(zona nula normalizada por COALESCE no índice).

`public.record_dwell_observation(...)` aplica histerese:

- confiança < `min_confidence` → `low_confidence`, nem entra;
- reaparecer dentro de `gap_seconds` → `extended` (oscilação do detector não
  fragmenta a permanência);
- observação com carimbo anterior ao último visto → `ignored_out_of_order`
  (nunca encolhe a janela nem infla `detections`);
- além da folga, ou além de `max_open_seconds` → fecha a anterior e abre outra.
  O teto duro existe porque sessão de 12h é câmera congelada, não pessoa parada.

`evaluate_dwell_alerts()` só emite com `detections >= min_detections` **e** duração
≥ limite, com cooldown por câmera+zona; sessões já avaliadas recebem `alerted_at`
mesmo quando suprimidas, para não reprocessar. `close_stale_dwell_sessions()`
fecha as paradas. Cron: ambas a cada minuto.

## Veículo recorrente

`evaluate_vehicle_recurrence(window, min_passes)` conta **passagens distintas**:
releituras da mesma placa dentro de `same_pass_seconds` são a mesma passagem
(senão um carro parado no portão viraria "recorrente"). Placa em `registered_plates`
com `list_type='blacklist'` sobe a gravidade para `critical`. Alerta vai para
`public.alerts` com `type='recurrent_vehicle'`, cooldown de 3h por placa.
Cron a cada 5 min.

## Paridade

Constantes em `src/lib/analytics/dwellTracker.ts` (`DWELL_POLICY`,
`VEHICLE_RECURRENCE_POLICY`) espelham `public.dwell_policy()` e
`public.vehicle_recurrence_policy()`. O gate compara os valores literalmente —
mudar um lado sem o outro reprova o CI.

## Gate

`npm run db:check:dwell-analytics` (dentro de `db:check:all`): RLS + policy própria,
zero privilégio para anon, índice único e CHECKs, paridade das duas políticas,
rotinas definer/`service_role`-only e bateria funcional em `BEGIN; ... ROLLBACK;`
(histerese, fora de ordem, alerta, idempotência, colapso de releitura, cooldown).

## Cicatriz

`public.alerts.severity` é `rule_severity` e `type` é `alert_type`: `CASE` que
devolve texto **precisa** de cast explícito. O erro só apareceu no teste funcional
— a migração aplicou sem reclamar.
