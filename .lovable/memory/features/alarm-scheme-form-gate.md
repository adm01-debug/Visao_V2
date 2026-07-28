---
name: Alarm Scheme Form & Gate
description: Ondas 218/219 — formulário de esquema de alarme com pré-validação pela régua única (contagem espelhando o banco) e gate `db:check:alarm-schemes` cobrindo ACL, RLS, paridade e 9 guardas exercidas
type: feature
---

# Formulário e gate dos esquemas de alarme (Ondas 218-219)

## Onda 218 — `src/lib/alarms/alarmSchemeForm.ts` + `AlarmSchemeFormDialog`

- O formulário **não** cria régua nova: converte o estado dos campos em
  `AlarmSchemeDraft` e submete a `diagnoseScheme` (Onda 215).
- **F1** achado `blocking` recusa a gravação; **F2** achado `degrading` só
  avisa (apagar/impedir é pior que avisar em destaque).
- **F3 — a armadilha central:** `diagnoseScheme` aplica o teto de 36 sobre as
  ações **viáveis** (canais removidos já saíram da conta); o trigger
  `enforce_alarm_scheme_rules` conta o **JSON cru** que será gravado. Um
  cadastro podia passar na UI e morrer com erro 23514 bruto.
  `storedChannelTotal()` espelha a contagem do servidor byte a byte e recusa
  antes, **nomeando** as ações responsáveis.
- **F6** `disconnect_threshold_s` só é persistido para `device_disconnected`;
  nos demais tipos vai `null` (número guardado que ninguém lê mente na
  auditoria).
- `translateServerRefusal` traduz as recusas do banco — nunca vaza código do
  Postgres para o operador.
- Botão "Salvar" desabilitado enquanto houver recusa; edição reidrata pelo
  `draft` exposto por `useAlarmSchemes`.

## Onda 219 — gate `npm run db:check:alarm-schemes`

Roda dentro de `db:check:all` (job `db-guardrails`).

1. **ACL pelo catálogo** (`pg_class.relacl` + `aclexplode`, nunca
   `information_schema`): `anon` e `PUBLIC` sem nenhum privilégio.
2. **RLS** ligada, com política de dono e trilha `has_role` para admin.
3. **Paridade TS ↔ SQL**: teto 36, nome ≤120, faixa 30–3600 e os **21 tipos**
   do catálogo nos dois sentidos (tipo só no CHECK também falha).
4. **Exercício dinâmico** via `public.alarm_scheme_selftest()`
   (SECURITY DEFINER, revogada de anon/authenticated/PUBLIC), em transação
   revertida: 9 guardas violadas uma a uma **+ 2 contraprovas** — caso feliz
   aceito e fronteira exata de 36 aceita, para que o teto não vire veto geral.
5. **Regra única na UI**: falha se o formulário deixar de chamar
   `diagnoseScheme`/`storedChannelTotal` ou passar a decidir saúde localmente.

Validado por mutação: alterar `MAX_EVENT_CHANNELS` para 48 derruba o gate.
