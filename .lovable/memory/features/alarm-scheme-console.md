---
name: Alarm Scheme Console
description: Ondas 216/217 — tela `/esquemas-de-alarme` (linha amarela + ícone) e persistência `alarm_schemes` com RLS e espelho SQL de S1/S2/S5/S6/S10
type: feature
---

# Console e persistência dos esquemas de alarme (Ondas 216-217)

## Onda 217 — banco (`public.alarm_schemes`)

- `user_id` com default `auth.uid()`; RLS: dono faz tudo, `admin` só lê (auditoria).
- `anon` revogado; grants para `authenticated`/`service_role`.
- **Espelho SQL das leis da Onda 215** — o banco é a última linha, não o único juiz:
  - S1 `CHECK length(btrim(name)) BETWEEN 1 AND 120`
  - S2 `CHECK event_type IN (...)` os 21 tipos do catálogo
  - S5 trigger `enforce_alarm_scheme_rules` + `alarm_scheme_channel_total(jsonb)`:
    exibidos + gravados > 36 → recusa (nunca trunca em silêncio)
  - S6 `face_recognized` exige **exatamente uma** biblioteca
  - S10 `disconnect_threshold_s` entre 30 e 3600
- Exercício dinâmico feito em transação revertida: as 6 guardas foram violadas
  uma a uma e a fronteira 36 (aceita) / 37 (recusa) confirmada.

## Onda 216 — tela `/esquemas-de-alarme` (manager+)

- `useAlarmSchemes` lê a tabela **com desconfiança** (nada é assumido
  bem-formado) e aplica `diagnoseScheme` + `detectDuplicatePairings`.
- Linha malformada nunca é escondida: vira `inconsistent`/`inoperative`.
  Apagar é pior que avisar.
- `AlarmSchemeTable`: borda/fundo **amarelo** para inconsistente, **vermelho**
  para inoperante, ícone com tooltip, contador `total/36` com ações recusadas
  nomeadas, e "Desabilitado" como badge separado do diagnóstico (S9).
- Duplicidade IA/não-IA aparece como aviso do **conjunto**, acima da tabela.
- Sidebar: item em Configurações; alias `/alarm-schemes`.
