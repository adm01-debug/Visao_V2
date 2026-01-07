# 🔒 Security Guide - Projeto VISÃO

## Práticas de Segurança

---

## 1. Autenticação

| Método | Uso |
|--------|-----|
| JWT | API requests |
| Session | Web app |
| API Key | Integrações |

---

## 2. Row Level Security (RLS)

```sql
-- Exemplo de política
CREATE POLICY "Users see own data"
ON cameras FOR SELECT
USING (auth.uid() = user_id);
```

---

## 3. HTTPS

- Todas comunicações via HTTPS
- Certificados TLS 1.3
- HSTS habilitado

---

## 4. Criptografia

| Dado | Método |
|------|--------|
| Senhas | bcrypt |
| Face encodings | AES-256 |
| API keys | SHA-256 |

---

## 5. Headers de Segurança

```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Content-Security-Policy "default-src 'self'";
```

---

## 6. Rate Limiting

| Endpoint | Limite |
|----------|--------|
| `/api/*` | 100/min |
| `/auth/*` | 10/min |
| `/recognition` | 50/min |

---

## 7. Validação de Input

```typescript
import { z } from 'zod';

const alertSchema = z.object({
  type: z.enum(['intrusion', 'blacklist']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  cameraId: z.string().uuid(),
});
```

---

## 8. LGPD Compliance

- ✅ Consentimento explícito
- ✅ Direito ao esquecimento
- ✅ Exportação de dados
- ✅ Logs de auditoria

---

## 9. Auditoria

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action TEXT,
  resource TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ
);
```

---

## 10. Reportar Vulnerabilidades

Email: security@visao.app

**Não divulgue publicamente** até correção.

---

**Última atualização:** 06/01/2026
