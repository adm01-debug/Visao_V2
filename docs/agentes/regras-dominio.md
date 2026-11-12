# Regras de domínio — VISÃO V2

Ler ao mexer em câmeras, evidências, zonas, alarmes, colaboração, retenção ou qualquer tela nova.
Regras curtas em `AGENTS.md`.

## 1. Multi-tenant: `organization_id` em tudo

O isolamento do produto é por `organization_id` (70 ocorrências no schema tipado,
`src/integrations/supabase/types.ts`). Toda tabela nova:

1. nasce com a coluna `organization_id`;
2. nasce com RLS habilitado e policy que filtra pela organização do usuário autenticado;
3. nasce com `GRANT` explícito para `authenticated`/`service_role`.

Os três são cobrados por `npm run check:migrations` (R1/R2) e pelo check obrigatório
`Guardrails de banco` na PR. Policy irrestrita, policy ligada a `PUBLIC` e função
`SECURITY DEFINER` exposta a `anon` **falham o merge** — não tente contornar com `lint-ignore`.

## 2. Credencial de câmera: só pela vault

`cameras.stream_url` carrega usuário e senha do equipamento. Só duas edges podem ler a coluna:
`camera-credentials-vault` e `resolve-camera-url` (gate `check:no-plain-rtsp`). Qualquer outro worker que
precise de stream pede à vault.

Toda `action` da vault precisa de `logVaultAudit(...)` **no mesmo case block** — cobrado por
`npm run check:vault-audit-coverage` (`scripts/check-vault-audit-coverage.mjs`). Acesso a credencial sem
trilha de auditoria é falha de compliance, não detalhe.

## 3. Evidência e cadeia de custódia

Fluxo já implementado, com edges próprias — não reimplemente, estenda:
`evidence-custody` → `evidence-seal` → `evidence-dossier` → `evidence-exports`, com
`timeline-attestation` e a tela `AttestationConferencePage`. Selo e atestação são a prova jurídica do
clipe: nunca gere, reescreva ou apague registro de custódia "para testar". Gravação envelhecida vai de
quente para frio por `archive-warm-to-cold`; retenção tem registro próprio
(`db:check:retention-registry`, `db:check:retention-alerts`).

## 4. Biometria e dados sensíveis (LGPD)

Reconhecimento facial, placas e comportamento produzem dado pessoal sensível:
`recognition_logs`, `plate_detections`, pessoas/blacklist/VIP, `detect-faces`, `compare-faces`,
`analyze-license-plate`, `detect-behavior`.

- Nunca envie imagem, embedding facial ou placa para serviço externo que não esteja já no
  `.env.example`/CSP.
- Nunca relaxe RLS dessas tabelas "para debugar" — use `service_role` em query de diagnóstico, só leitura.
- `delete-my-account` existe: exclusão de titular tem caminho próprio, não faça `DELETE` manual.
- CSP tem allowlist cobrada por `npm run check:csp`; host novo exige entrada lá e justificativa na PR.

## 5. Alarmes, zonas e admissão de evento

Conceitos com tabelas, gates e simulações próprios — procure antes de criar:
esquemas de alarme (`db:check:alarm-schemes`, `db:check:alarm-recurrence`, `AlarmSchemesPage`),
armado agora (`db:check:armed-now`), admissão de evento e seu ledger
(`db:check:event-admission`, `db:check:admission-ledger`, `admission-backlog`, `admission-reconcile`,
`admission-trend-alert`, `admission-orphan`, `admission-retention`), escalonamento
(`db:check:escalation`, `escalation-profiles`, `escalation-decay`), silêncio de dispositivo
(`db:check:device-silence`), supressão e quarentena (`db:check:quarantine`, `suppression-retention`).

Regra: antes de escrever verificação nova de domínio, liste os `db:check:*` e `simulate:*`
(74 + 101 scripts) — a chance de já existir é alta.

## 6. Padrão de tela (cobrado por gate)

- Página nova em `src/pages/*.tsx` usa `<PageContent>` como wrapper raiz
  (`npm run check:page-content`; hoje em modo warn, com lista `PENDING_MIGRATION`).
- A classe `mb-mobile-nav` é aplicada **uma única vez** em
  `src/components/layout/MainLayout.tsx` — página nenhuma redeclara
  (`npm run check:mobile-nav`, falha o CI).
- Rota nova = `lazy()` em `src/App.tsx` + entrada na navegação. Sem entrada na UI não é entregue.
- Estados de erro, loading e vazio são obrigatórios; skeleton tem gate anti-CLS
  (`npm run check:skeletons`).
- São 83 páginas e ~645 componentes: procure o componente equivalente antes de criar outro.

## 7. Centrais de monitoramento e colaboração

`monitoring_centers` e a malha de colaboração têm governança, notificações, silêncio, retenção e badge de
navegação próprios (`db:check:monitoring-centers`, `collab-network`, `collab-governance`,
`collab-notifications`, `collab-silence`, `collab-retention`, `collab-nav-badge`,
`collab-entry-lifecycle`). Mudança aí afeta quem recebe alarme de quem — trate como mudança de
arquitetura: chame o dono.
