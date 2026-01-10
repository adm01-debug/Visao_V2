# 🔀 Middleware do VISÃO

## Middleware Disponíveis (7)

### 🔐 auth.ts
Middleware de autenticação.
- Verifica tokens JWT
- Valida sessões
- Renova tokens expirados

### ❌ errorHandler.ts
Tratamento global de erros.
- Captura exceções
- Formata mensagens de erro
- Log de erros

### 🌐 ipWhitelist.ts
Controle de acesso por IP.
- Whitelist de IPs
- Bloqueio de IPs suspeitos

### 📝 logging.ts
Logging de requisições.
- Log de requests/responses
- Métricas de tempo
- Tracking de usuário

### ⏱️ rateLimit.ts
Limitação de requisições.
- Rate limiting por IP
- Rate limiting por usuário
- Proteção contra DDoS

### ✅ validation.ts
Validação de dados.
- Validação de schemas
- Sanitização de inputs
- Mensagens de erro

## Uso

```typescript
import { authMiddleware, rateLimitMiddleware } from "@/middleware";

// Aplicar em rotas
app.use("/api", authMiddleware);
app.use("/api", rateLimitMiddleware({ max: 100, window: 60000 }));
```

---

*Atualizado em 10/01/2026*

