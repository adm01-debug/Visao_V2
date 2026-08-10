---
name: Command Reliability (obediência ao comando)
description: Onda 196 — reputação por equipamento na fila de comandos; silêncio ≠ falha declarada, amostra curta é "não sei", piso de Wilson 95% com histerese, simulate:wave196
type: feature
---

`src/lib/devices/commandReliability.ts` é a regra única da série de comandos por
equipamento (janela de 30 dias). Pura: sem rede, sem relógio próprio, sem I/O.
Adaptador: `src/hooks/useCommandReliability.ts`; UI: `CommandReliabilityCard`
no `/manutencao`. Gate: `npm run simulate:wave196` (416.781 asserções) +
`src/lib/devices/__tests__/commandReliability.test.ts`.

Invariantes que não podem ser afrouxadas:

1. **Silêncio ≠ falha declarada.** `settled_by='sweep'` é ausência observada e
   entra só na conta de silêncio; `failed` reportado pelo equipamento é prova de
   vida e vira `failing` (ação corretiva diferente: firmware/config, não rede).
   Achatar os dois faz o mantenedor trocar o aparelho errado.
2. **Amostra curta é `insufficient_evidence`, nunca `healthy`** (mínimo 5 ordens
   terminais) e nunca gera chamado — senão toda instalação nova nasce aprovada
   ou gritando.
3. **Decisão pelo piso de Wilson 95%**, não pela média (mesma régua da Onda 122):
   2 silêncios em 3 ordens não são 66% de doença estabelecida.
4. **Histerese de 5 p.p.** na volta; agravamento acima do corte sempre passa.
5. **Ordem viva não conta.** Só estados terminais; contar execução em andamento
   condenaria antes do fato.
6. **Ato físico sem destino conhecido (`device.reboot`/`osd.write` varridos) só
   eleva a gravidade, nunca reduz** — pode haver gravador reiniciado sem registro.
7. **Corte da janela congelado por busca**, nunca `Date.now()` na renderização.
