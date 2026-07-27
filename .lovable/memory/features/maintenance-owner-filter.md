---
name: Maintenance Owner Filter
description: Onda 148 — recorte por responsável no console de manutenção; baldes derivados das linhas, `unrouted` de primeira classe, degradação para `all`
type: feature
---

# Filtro por responsável (Onda 148)

`src/lib/maintenance/ownerFilter.ts` é a **regra única** do recorte por dono no
console `/manutencao`. Puro (sem React, sem rede) para ser varrido no CI.

## Regras que existem por causa de falha prevista
- **Balde derivado das linhas, nunca fixo** — "Técnico de campo (0)" é ruído.
- **`unrouted` é balde de primeira classe** — rotinas das Ondas 110–135 são
  anteriores ao roteamento; escondê-las perderia incidente.
- **Contagem do crachá = ABERTOS** (trabalho pendente), `total` disponível para
  não mentir sobre o tamanho da lista.
- **Seleção inválida degrada para `all`** — o balde some entre refetches quando
  o dono reconhece tudo; tela vazia sem explicação é pior.
- **O filtro nunca reordena** — a fila de urgência é da Onda 136.
- Na UI o valor efetivo é **derivado** dos baldes a cada render (`resolveOwnerFilter`),
  nunca sincronizado por `useEffect`.

## Gates
- `npm run sim:wave148` — 600 cenários, invariantes I1..I6.
- `src/lib/__tests__/ownerFilter.test.ts` — 11 testes espelhando as invariantes.
