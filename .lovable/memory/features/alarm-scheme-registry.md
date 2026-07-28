---
name: Alarm Scheme Registry
description: Onda 215 — cadastro do esquema de alarme (catálogo de 21 eventos, ações, teto de 36 canais, biblioteca de faces, duplicidade IA, desconexão manual); regra única em alarmScheme.ts, `simulate:wave215`
type: feature
---

# Esquema de alarme (Onda 215)

Paridade com **§Configuração de alarme** do SIM Next. A Onda 178 resolveu o
*comportamento* (OR abre / AND fecha, agenda, rearme); esta resolve o
**cadastro**, julgado antes de qualquer disparo.

Regra única: `src/lib/alarms/alarmScheme.ts` — pura, sem relógio, nunca lança.
Reaproveita `normalizeSchedule` da Onda 178 (não reimplementa agenda).

## Invariantes (S1..S10)

1. **S1** Nome obrigatório (≤120). Cadastro anônimo não é auditável.
2. **S2** Tipo fora do catálogo de 21 eventos = **inoperante**; nunca vira
   "evento genérico".
3. **S3** Perder parte das origens degrada (`inconsistent`) e segue protegendo
   o resto; perder todas = `inoperative`.
4. **S4** Esquema sem ação viável é **inoperante** — "ok e silencioso" é a pior
   falha possível (cobertura falsa). Ações sem canal (e-mail/webhook/som/relé)
   são válidas; ações de canal (exibir/gravar/foto/PTZ) sem canal vivo não.
5. **S5** Teto de **36 canais por evento** = exibidos **+** gravados (mesmo
   canal nos dois conta 2). Excedente é recusado em ordem estável e **nomeado**
   em `budget.refusedActionIds`; nunca truncado em silêncio.
6. **S6** `face_recognized` exige **exatamente uma** biblioteca, pertencente a
   uma origem viva. Outros tipos com biblioteca = achado degradante.
7. **S7** Duplicidade IA/não-IA (`tripwire`↔`tripwire_ai`, `intrusion`↔
   `intrusion_ai`) é achado do **conjunto** (`detectDuplicatePairings`), só
   entre esquemas **armados**, e nunca desativa nenhum dos dois sozinha.
8. **S8** Agenda: ≤6 períodos/dia, vazia = 24×7; truncamento e período inválido
   são declarados, não silenciosos.
9. **S9** `enabled` é **eixo separado** de `health`: esquema desligado continua
   exibindo inconsistências, senão o operador "conserta" o aviso desligando a
   regra. `armed = enabled && health !== 'inoperative'`.
10. **S10** `device_disconnected`: limiar padrão 180s (faixa 30–3600, fora dela
    volta ao padrão com achado) e **desconexão manual nunca vira alarme**.

## Gates
- `npm run simulate:wave215` — 257.869 asserções em 28.457 cenários
  (matriz do catálogo, fuzz de 20k cadastros, monotonicidade da remoção,
  duplicidade IA, matriz de desconexão, entradas hostis, fronteira do teto).
- `src/lib/alarms/__tests__/alarmScheme.test.ts` — 16 testes.
