# Wave 22 — Zod validation nas 5 edge functions InsightFace

## Resumo
Novo módulo `supabase/functions/_shared/insightface-schemas.ts` centraliza schemas Zod strict + helper `parseBody(req, schema)` que retorna erro estruturado `[400]: validation failed — <path>: <message>`.

## Schemas
| Endpoint | Schema | Regras |
|---|---|---|
| `insightface-detect` | `DetectSchema` | `image` obrigatória (1..7.5M chars); `max_faces` int 1..50 |
| `insightface-encode` | `EncodeSchema` | `image` obrigatória; `align` bool opcional |
| `insightface-analyze` | `AnalyzeSchema` | `image` obrigatória |
| `insightface-liveness` | `LivenessSchema` | `image` obrigatória; `threshold` num 0.5..0.99 |
| `insightface-migrate-batch` | `MigrateBatchSchema` | `batch_size` int 1..50; `dry_run` bool; body vazio permitido |

`.strict()` em todos rejeita campos desconhecidos (proto pollution / trojan fields).

## Simulação
- 28 cenários — inputs válidos, malformados, adversariais (SQLi, XSS, proto pollution, oversized payloads, arrays no lugar de objetos, tipos errados). 0 unsafe.

## Impacto
- Rejeição imediata (400) antes de consumir cota Replicate.
- Mensagens de erro precisas: `image: image is required` / `max_faces: Number must be less than or equal to 50`.
- Limite de 7.5M chars bloqueia DoS por payloads gigantes.
- Backward-compat: assinatura pública igual; comportamento sempre superset (nunca aceita menos).
