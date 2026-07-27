---
name: Failover de caminho de conectividade (Onda 152)
description: Onda 152 — regra única de ordenação direct/port_forward/vpn/relay com quarentena que rebaixa (nunca exclui), recuo exponencial e promoção por Wilson; gate db:check:path-failover
type: feature
---

`src/lib/devices/pathFailover.ts` é a **regra única** de escolha de rota até a
câmera. Pura, relógio injetado (`nowMs`), sem E/S — reproduzível no navegador,
na borda e no simulador.

Concilia o que o humano pediu (`camera_connectivity_preferences.preferred_path`)
com o que de fato funcionou (`connectivity_resolution_telemetry`).

## Decisões que não devem ser afrouxadas

- **Só `transport` culpa o caminho.** `auth`/`config`/`device` contam como
  amostra e nunca armam quarentena — senha trocada falha em todas as rotas e
  exilaria a frota inteira. Mesma taxonomia da Onda 146.
- **Quarentena rebaixa, nunca exclui.** A ordem devolvida é sempre uma
  permutação exata dos caminhos configurados; com um só caminho, mesmo em
  quarentena, ele continua sendo tentado. Nunca "sem rota" por precaução.
- **Recuo exponencial 30s → 8min (teto)**, monotônico, com `Math.min` antes da
  potência para não virar `Infinity` com contador corrompido. Sem
  `lastTransportFailureAtMs` a quarentena é tratada como vencida (preferimos
  uma tentativa extra a exílio por telemetria incompleta).
- **Promoção exige evidência:** piso de Wilson 95% do candidato ≥ o do
  preferido + 10 p.p., com ≥10 tentativas. Fora disso a preferência humana
  vence.
- **Empate cai na ordem canônica** `direct, port_forward, vpn, relay` — sem
  isso a mesma câmera muda de ordem a cada render e a investigação morre.

## Gates

- `npm run simulate:wave152` — **24.384 cenários** (nomeados, combinatória
  16 subconjuntos × 4 preferidos × falhas × idades × taxas, fuzz semeado e 300
  trajetórias vivas), invariantes F1..F7.
- `npm run db:check:path-failover` — compara política e ordem canônica entre o
  TS e a cópia JS do simulador **antes** de rodá-lo (cópia dessincronizada faz
  o simulador provar invariantes de outro sistema). Incluído em `db:check:all`.
- 10 testes unitários em `src/lib/devices/__tests__/pathFailover.test.ts`.
