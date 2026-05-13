# 🗓️ Calendário de Revisão de Segurança — VISÃO

Este documento estabelece a cadência obrigatória de revisões de segurança para manter a conformidade do sistema e mitigar riscos de forma proativa.

## 🔄 Ciclos de Revisão

### 🛡️ Mensal: Auditoria de Dependências e Secrets
*   **Responsável:** Time de DevOps / Backend
*   **Ações:**
    *   Revisar alertas do `dependabot` e `npm audit`.
    *   Validar se todos os lints de segurança (`no-console`, `no-hardcoded-colors`) estão passando no CI.
    *   Verificar logs de rotação de chaves em Lovable Cloud.
    *   Auditar o arquivo `src/integrations/supabase/types.ts` para garantir que novas tabelas têm RLS.

### 🔍 Trimestral: Pen Test Interno e RLS Deep Dive
*   **Responsável:** Security Architect / QA Lead
*   **Ações:**
    *   Execução completa da suíte de testes `pgTAP` para RLS.
    *   Simulação de ataques OWASP Top 10 (Injection, Broken Auth) via ferramentas automatizadas (ex: OWASP ZAP).
    *   Revisão manual das policies de RLS mais complexas.
    *   Auditoria de logs de acesso a dados sensíveis (`audit_logs`).

### 📜 Semestral: Conformidade LGPD e Auditoria de Acessos
*   **Responsável:** DPO / Tech Lead
*   **Ações:**
    *   Validar o fluxo de "Direito ao Esquecimento" (`delete-my-account`).
    *   Revisar o inventário de PII (Personally Identifiable Information).
    *   Auditoria de permissões em `user_roles` (quem tem acesso de `admin` e por quê).
    *   Revisão do Plano de Disaster Recovery (DR).

---

## 📅 Próximas Datas Planejadas (Exemplo)
*   **Q2 2026:** Pen Test RLS (2026-06-15)
*   **Junho 2026:** Auditoria Mensal de Deps (2026-06-01)
*   **Q3 2026:** Auditoria LGPD (2026-09-10)

> **"Segurança não é um produto, é um processo."** — Bruce Schneier
