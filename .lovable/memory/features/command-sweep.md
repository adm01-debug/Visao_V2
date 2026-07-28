---
name: Command Sweep (varredura de ordens abandonadas)
description: Onda 195 — varredura periódica da fila de comandos; autoria do encerramento (device vs sweep), varredura nunca inventa laudo nem encerra ordem viva, gate db:check:command-sweep
type: feature
---

`src/lib/devices/commandSweep.ts` é a regra única; espelho SQL em
`public.sweep_device_remote_commands(p_now, p_limit)` (service_role, cron
`*/5 * * * *`). Gate: `npm run db:check:command-sweep` (paridade app×banco linha
a linha + autoteste `device_remote_command_sweep_selftest()`), simulação
`npm run simulate:wave195` (381.525 asserções).

Invariantes que não podem ser afrouxadas:

1. **Autoria é fato registrado.** `device_remote_commands.settled_by` só aceita
   `device` (laudo carimbado) ou `sweep` (ausência observada), é escrita uma
   única vez e o guard recusa `settled_by='sweep'` com `reported_at`/`result`
   preenchidos. Varredura JAMAIS produz `completed`.
2. **Ordem viva nunca é encerrada.** Empréstimo de 60s correndo é execução em
   andamento — encerrar ali produziria dois reinícios quando o equipamento
   voltasse com o laudo.
3. **Prazo vence antes do empréstimo.** Ordem vencida é `expired`
   (`expired_undelivered` vs `expired_in_flight`), nunca `failed`.
4. **Abandono exige as duas condições juntas:** `delivery_attempts >= 3` E
   empréstimo vencido. Só o contador fecharia ordem em plena terceira tentativa.
5. **Dado incoerente não é encerrado.** `delivered` sem `delivered_at` fica vivo
   nos dois lados — tratar carimbo ausente como época zero (`?? 0`) fechava
   ordem por um empréstimo nunca medido (bug encontrado pelo gate diferencial).
6. **Corte é sempre recebido (`p_now`/`now`), nunca `Date.now()` interno**, para
   que o mesmo retrato produza o mesmo veredito em teste, no SQL e no cron.
7. **Lote adia, nunca absolve.** O que sobra do `p_limit` fica para a próxima
   passada e não vira "vivo".

UI: `RemoteCommandPanel` mostra "encerrado pela varredura (sem laudo do
equipamento)" — o operador nunca lê ausência como resultado.
