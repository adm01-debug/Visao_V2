# 🔒 Security Guide - Projeto VISÃO

## Práticas de Segurança

---

## 1. Autenticação

### JWT Tokens
- Access token: 1 hora
- Refresh token: 7 dias
- Rotação automática

### MFA (Multi-Factor)
```typescript
await supabase.auth.mfa.enroll({ factorType: 'totp' });
```

---

## 2. Row Level Security (RLS)

```sql
-- Usuários só veem seus dados
CREATE POLICY "Users see own data"
ON cameras FOR SELECT
USING (auth.uid() = user_id);

-- Admins veem tudo
CREATE POLICY "Admins see all"
ON cameras FOR ALL
USING (is_admin(auth.uid()));
```

---

## 3. Validação de Input

```typescript
import { z } from 'zod';

const cameraSchema = z.object({
  name: z.string().min(1).max(100),
  rtspUrl: z.string().url(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
});
```

---

## 4. HTTPS/TLS

- Todas conexões via HTTPS
- TLS 1.3 mínimo
- HSTS habilitado

---

## 5. Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           img-src 'self' blob: data:; 
           script-src 'self' 'unsafe-inline';">
```

---

## 6. Rate Limiting

| Endpoint | Limite |
|----------|--------|
| Auth | 10/min |
| API | 100/min |
| Recognition | 50/min |

---

## 7. Criptografia

### Em Trânsito
- TLS 1.3
- Certificate pinning

### Em Repouso
- AES-256 para dados sensíveis
- Face encodings criptografados

---

## 8. Auditoria

```sql
-- Log de ações
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action TEXT,
  resource TEXT,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ
);
```

---

## 9. Proteções OWASP

| Vulnerabilidade | Proteção |
|-----------------|----------|
| SQL Injection | Prepared statements |
| XSS | Sanitização, CSP |
| CSRF | Tokens, SameSite |
| IDOR | RLS, validação |

---

## 10. Reportar Vulnerabilidades

Email: security@visao.app

**Não divulgue publicamente antes de contato.**

---

**Última atualização:** 06/01/2026
