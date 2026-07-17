# 🔒 Política de Segurança — VISÃO

## Versões Suportadas

| Versão | Suportada          |
| ------ | ------------------ |
| 2.x    | :white_check_mark: |
| 1.x    | :white_check_mark: (patches críticos) |
| < 1.0  | :x:                |

## Reportando uma Vulnerabilidade

Se você tem informações sobre um problema ou vulnerabilidade de segurança no VISÃO, **não abra uma Issue pública**. Envie um e-mail para:

**security@visao.app**

Forneça o máximo de informação possível:

- **Descrição detalhada** que permita reproduzir a vulnerabilidade.
- **Quem pode explorar** e o que ganharia. Cenário de ataque.
- **Exploits conhecidos**, se houver.
- **Componente afetado** (frontend, edge function, RLS, integração).
- **Impacto potencial** (LGPD, exposição de dados, escalada de privilégio).
- **Sugestão de correção**, se tiver.

Um membro do Time de Segurança revisará o e-mail e entrará em contato para colaborar na resolução. Meta de primeira resposta: **48 horas úteis**.

### Divulgação responsável

Pedimos que você **não divulgue publicamente** a vulnerabilidade até que uma correção esteja disponível. Reconhecemos publicamente pesquisadores no `CHANGELOG.md` mediante consentimento.

### Chave PGP

Para relatórios com informação extremamente sensível, criptografe usando nossa chave PGP pública. A fingerprint e a chave completa ficam publicadas em `docs/security/pgp-public-key.asc` e podem ser importadas via:

```bash
gpg --import docs/security/pgp-public-key.asc
```

> Nota operacional: a chave é gerada e rotacionada pelo time de segurança do workspace; a versão versionada neste repositório é a **pública** apenas.

## Práticas de Segurança em Runtime

### Autenticação e autorização
- Supabase Auth com HIBP habilitado e política de senha forte.
- Row Level Security (RLS) em 100% das tabelas públicas — isolamento por `auth.uid()`.
- RBAC via `user_roles` (admin/manager/operator/viewer) + função `has_role` `SECURITY DEFINER`.
- Rotas protegidas via `ProtectedLayoutRoute` / `ProtectedRoute`.

### Dados sensíveis
- Nunca commitar `.env` (bloqueado por `.gitignore`).
- Segredos server-side apenas em Supabase Vault / env vars de edge functions.
- `service_role` **nunca** exposto no frontend.

### Edge Functions
- CORS com allowlist dinâmica.
- Rate limiting sliding window por IP.
- Validação Zod obrigatória em toda entrada.
- Logs estruturados JSON com scrubbing de PII.

### Frontend
- Sanitização de inputs (Zod + DOMPurify onde aplicável).
- CSP headers e HTTPS obrigatório em produção.
- Sem `dangerouslySetInnerHTML` sem sanitização explícita.

### Observabilidade
- `audit_logs` imutável (via triggers) para ações sensíveis.
- Sentry para erros de runtime.
- Alertas em `panic_events`, mudança de role e falha de auth.

## Atualizações de Segurança

- Dependabot alerts semanais.
- `npm audit` em CI (bloqueia merge em `high`+).
- Revisão manual de PRs que tocam RLS, auth ou edge functions.
- Migração de signing keys do Supabase acompanhada.

## Resposta a Incidentes

1. **Identificação e isolamento** — desabilitar chave/rota/função afetada.
2. **Análise de impacto** — dados expostos, usuários afetados, janela temporal.
3. **Correção e deploy** — patch + verificação em staging antes de prod.
4. **Comunicação** — notificar afetados dentro do prazo LGPD (72h se aplicável).
5. **Post-mortem** — documentar em `docs/incidents/` e criar ações preventivas.

## Escopo

**Em escopo:** vulnerabilidades no código deste repositório, edge functions, políticas RLS, migrations e integrações oficiais.

**Fora de escopo:** vulnerabilidades em dependências upstream já reportadas ao mantenedor, engenharia social contra usuários finais, DoS volumétrico contra infraestrutura de terceiros.
