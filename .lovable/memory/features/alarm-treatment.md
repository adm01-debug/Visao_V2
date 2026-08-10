---
name: Alarm Treatment
description: Onda 177 — tratativa de alarme (SIM Next §Alarme): transições legais, desfecho com autor/motivo/código e trilha imutável
type: feature
---

# Tratativa de alarme (Onda 177)

Paridade com a tela **Alarme** do Intelbras SIM Next: alarme não é notificação,
é pendência com dono e desfecho.

## Regra única

`src/lib/alarms/alarmTreatment.ts` — pura, sem relógio próprio, nunca lança.
O banco é o **espelho** dessa tabela-verdade (trigger `enforce_alert_transition`

- RPC `treat_event_alert`). Divergir os dois é bug de segurança, não de estilo.

## Invariantes

1. Transições legais: `open → acknowledged|dismissed`, `acknowledged → resolved|dismissed`,
   `resolved|dismissed → open` (reabertura, exige perfil owner/admin no servidor).
   **Nunca** `open → resolved`: esconderia que ninguém olhou.
2. Encerrar exige motivo (≥3 caracteres úteis, ≤2000) e código de desfecho.
3. Encerrar exige autor (`auth.uid()` no servidor; nunca vindo do corpo).
4. Códigos são exclusivos por desfecho: `incident_confirmed|handled_on_site|no_action_needed`
   só resolvem; `false_positive|duplicate|test` só descartam (curva de ruído da detecção).
5. Relógio nunca retrocede: carimbo novo = `max(now, updatedAt)`. Duração zero > duração negativa.
6. Reabertura limpa carimbos de reconhecimento e desfecho — é fato novo, não desfazer.
7. `event_alert_treatments` é append-only: UPDATE e DELETE bloqueados por trigger.
   Exceção única: cascata quando o alarme pai já foi removido (senão a remoção trava).

## Gates

- `npm run simulate:wave177` — 220.660 asserções (matriz completa + fuzz de 4.000 cadeias
  com drift de relógio + entradas hostis).
- Exercício dinâmico em migração: 10 cenários no banco real (transição ilegal, autor
  ausente, motivo ausente, código cruzado, imutabilidade, RPC sem sessão, cascata).
