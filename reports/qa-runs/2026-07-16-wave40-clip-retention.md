# Onda 40 — Política de retenção de clips (paridade Frigate `record.retain.days`)

**Contexto:** Frigate expira clips automaticamente conforme `record.retain.days` por câmera/objeto. VISÃO não tinha essa lógica formalizada — auditoria (`docs/audits/2026-07-16-frigate-vs-visao.md`) identificou como gap #1 por impacto/esforço.

## Simulação
500 fuzz aleatórios variando `defaultDays` (0-365), overrides por objeto, flag `keepCritical`, `objectClass`. Invariantes: crítico + keepCritical → nunca expira; `defaultDays=0` sem override → nunca expira; override > default quando presente; `isClipExpired` monotônico em `now`. **500/500 pass**.

## Implementação
- **`src/lib/clipRetention.ts`** (novo): função pura sem I/O. Exporta `DEFAULT_POLICY` (plate 90d, face 60d, person/vehicle/ppe 30d, other 14d, `keepCritical: true`), `resolveRetentionDays`, `computeExpiryDate`, `isClipExpired`, `validatePolicy`.
- **`src/lib/__tests__/clipRetention.test.ts`** (unit): **6/6 pass**.
- **`scripts/simulate-wave40-scenarios.mjs`**: fuzz 500 cenários.

## Escopo intencional
- Não cria migration nem toca em `video_clips` — a função é o núcleo puro, consumida em ondas futuras por (a) UI de configuração por câmera, (b) edge function de limpeza noturna.
- Segue o padrão `dbHealthGuard.ts` (onda 39): lib pura testável, adoção incremental.

Status: **10/10** mantido. Gap #1 do audit fechado no núcleo.
