---
name: Camera IO Alarm
description: Onda 154 — I/O de alarme físico ONVIF; regra única `ioSafety` espelhada byte a byte na borda, trilha imutável e ação `trigger_output` nas regras
type: feature
---

# I/O de alarme físico (Onda 154 — Fase 1 do plano SIM Next)

## Regra única
`src/lib/devices/ioSafety.ts` é a ÚNICA autoridade sobre acionamento de saída.
`supabase/functions/_shared/ioSafety.ts` é uma cópia **byte a byte** (o gate
compara SHA-256). Nunca editar um lado só.

Invariantes que não podem cair:
- `set_inactive` (soltar o relé) **sempre passa**, mesmo dentro do cooldown —
  é a saída de emergência contra sirene travada.
- Intervalo mínimo efetivo = `max(250ms, min_interval_ms)`; piso absoluto nunca
  é contornável por configuração.
- Pulso entre 100 ms e 60 s; travar ligada só em porta `bistable`.
- Sem `cameras.control_io`, nada passa — checado no servidor, não na UI.
- O retorno ao repouso do pulso é feito pela Edge Function, não pelo firmware:
  muitos relés ignoram o `DelayTime` declarado.

## Banco
- `camera_io_ports` (única por `camera_id,port_token`) e `io_actuation_log`
  (append-only por trigger; `anon` sem privilégio nenhum).
- Vocabulário fixo por CHECK: `origin ∈ human|rule|event|schedule|test`,
  `outcome ∈ accepted|rejected|failed|completed`, `command ∈ pulse|set_active|set_inactive`.
- `rule_eligible_io_port(camera, user, now)` — SECURITY DEFINER com auto-gate
  por `auth.uid()`; devolve a folga de cooldown já calculada.

## Caminhos
- `camera-io-control` aceita JWT de usuário **ou** a chave de serviço
  (`origin: rule`). Chamada de sistema não ganha passe livre no `ioSafety`;
  só dispensa a checagem de capability, que já foi feita ao criar a regra.
- `discover` usa `tds:GetRelayOutputs` + `tmd:GetDigitalInputs`. Ausência do
  serviço DeviceIO **não é erro** — é equipamento sem entradas declaradas.
- Endpoint/credenciais ONVIF vêm de `camera_ptz_config` (mesma fonte do PTZ).

## Gate
`npm run db:check:camera-io` — espelho SHA-256, Vitest (10 testes + simulação
de ~9.5k cenários e 400 trajetórias), catálogo de permissão TS↔banco,
imutabilidade da trilha exercitada em transação revertida.
