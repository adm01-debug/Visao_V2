---
name: Owner SLA Aging
description: Onda 149 — dívida de atendimento por responsável no console de manutenção (prazo por par dono×severidade, estado do pior alerta aberto)
type: feature
---

# Onda 149 — Dívida de atendimento por responsável

Regra única em `src/lib/maintenance/ownerAging.ts` (pura, sem relógio próprio —
a idade vem de `MaintenanceAlertView.ageMinutes`, que já usa o `nowMs` injetado
em `buildMaintenanceConsole`).

- Prazo é do **par (dono, severidade)**, tabela `OWNER_SLA_MINUTES`. `unrouted`
  e `triage` compartilham o prazo mais curto entre os avisos.
- Estado do balde = **pior alerta aberto** (`idle` → `on_track` → `at_risk` a
  partir de 75% do prazo → `breached`). Nunca média.
- Reconhecido é inerte. `all` usa o prazo mais curto do vocabulário, então o
  agregado nunca é mais otimista que um balde.
- `minutesRemaining` usa arredondamento que **não cruza o zero** (folga de
  0,04 min não pode virar "prazo estourado").

Validação: `npm run sim:wave149` (700 cenários, 7 invariantes) +
`src/lib/__tests__/ownerAging.test.ts`. Ambos rodam no job de CI do PR.
