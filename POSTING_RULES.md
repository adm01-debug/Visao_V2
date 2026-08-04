# POSTING_RULES.md — Regras de contribuição

> Onda 50 do plano consolidado. Este documento normatiza issues, PRs e branches.

## Issues

Toda issue **deve** usar um dos templates em `.github/ISSUE_TEMPLATE/`:

- **bug_report.md** — reprodução, esperado vs. observado, ambiente
- **feature_request.md** — problema, solução proposta, alternativas
- **security.md** — reportar via SECURITY.md (não abrir issue pública)

Issues sem template recebem o label `needs-template` automaticamente e são fechadas em 7 dias sem resposta.

## Branches

Formato obrigatório: `<issue-number>-<slug-curto>`

Exemplos válidos:

- `123-fix-alert-race-condition`
- `456-add-alpr-whitelist`
- `789-refactor-camera-hook`

Prefixos reservados:

- `hotfix/` — apenas fixes críticos em produção
- `release/` — branches de release (uso do CI)
- `chore/` — mudanças que não geram issue (deps, docs internos)

## Pull Requests

- Título no formato Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `security:`
- Descrição referencia a issue: `Closes #123`
- Marcar checklist do template (`.github/PULL_REQUEST_TEMPLATE.md`)
- CI verde obrigatório antes de solicitar review
- 1 approval mínimo; 2 para mudanças em `supabase/functions/` ou `supabase/migrations/`

## Commits

- Conventional Commits (validado por commitlint)
- Assinar com GPG quando possível (`git commit -S`)
- Mensagem no imperativo: "add", "fix", "remove" — nunca "added", "fixing"

## Migrations

Toda migration em `supabase/migrations/`:

- **DEVE** incluir `GRANT` para todos os papéis relevantes
- **DEVE** habilitar RLS e criar policies na mesma migration
- **NÃO PODE** conter `DROP TABLE` sem review de 2 mantenedores

## Deprecação de API

Endpoints `/v1/*` são congelados (Onda 52). Alterações breaking exigem:

1. Novo endpoint `/v2/*` em paralelo
2. Header `Sunset: <RFC-1123-date>` no endpoint antigo
3. 6 meses de convivência mínima
4. Anúncio no CHANGELOG.md

## Reporte de segurança

**NÃO abrir issue pública.** Ver `SECURITY.md` para o canal privado (PGP).
