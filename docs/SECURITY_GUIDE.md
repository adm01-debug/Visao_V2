# 🔐 Guia de Segurança

## Autenticação

### JWT Tokens
- Access token: 15 minutos
- Refresh token: 7 dias
- Rotação automática de tokens

### 2FA (Two-Factor Authentication)
- TOTP (Google Authenticator)
- SMS backup codes

## Proteções

### CSRF
- Tokens por sessão
- Double submit cookie

### XSS
- Sanitização de input
- Content Security Policy
- HTTP-only cookies

### SQL Injection
- Prepared statements via Supabase
- Validação de input

## Rate Limiting

| Endpoint | Limite |
|----------|--------|
| Login | 5/min |
| API | 100/min |
| Upload | 10/min |

## IP Whitelist

```typescript
// Configuração em /config/ipWhitelist.ts
const allowedIPs = [
  "192.168.1.0/24",
  "10.0.0.0/8"
];
```

## Criptografia

- AES-256-GCM para dados em repouso
- TLS 1.3 para dados em trânsito
- Bcrypt para senhas (cost 12)

## Auditoria

- Logs de acesso
- Histórico de alterações
- Alertas de segurança

---

*Atualizado em 10/01/2026*

