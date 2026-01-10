# 📚 Bibliotecas do VISÃO (lib/)

## Estrutura

```
lib/
├── index.ts          # Export central
├── __tests__/        # 84 testes
└── *.ts              # 87 utilitários
```

## Utilitários por Categoria

### 🔐 Segurança
- `encryption.ts` - Criptografia AES
- `csrf.ts` - Proteção CSRF
- `xss.ts` - Sanitização XSS
- `passwordPolicy.ts` - Políticas de senha
- `tokenBlacklist.ts` - Blacklist de tokens
- `twoFactorAuth.ts` - 2FA
- `biometricAuth.ts` - Autenticação biométrica
- `sessionManager.ts` - Gerenciamento de sessão
- `secureSession.ts` - Sessões seguras
- `contentSecurityPolicy.ts` - CSP

### ⚡ Performance
- `memoize.ts` - Memoização com LRU
- `throttle.ts` - Throttling
- `batch.ts` - Processamento em lote
- `compression.ts` - Compressão de dados
- `pool.ts` - Connection pooling

### 📊 Monitoramento
- `sentry.ts` - Error tracking
- `prometheus.ts` - Métricas
- `grafana.ts` - Dashboards
- `jaeger.ts` - Tracing
- `opentelemetry.ts` - Telemetria
- `webVitals.ts` - Core Web Vitals

### 💾 Storage
- `indexedDB.ts` - IndexedDB wrapper
- `offlineStorage.ts` - Storage offline
- `cache.ts` - Cache em memória
- `encryptedStorage.ts` - Storage criptografado

### 📄 Exportação
- `pdfGenerator.ts` - Geração de PDFs
- `exportUtils.ts` - Utilitários de exportação

### 🔧 Sistema
- `logger.ts` - Logging
- `errorTracking.ts` - Rastreamento de erros
- `healthCheck.ts` - Health checks
- `scheduler.ts` - Agendamento
- `retry.ts` - Retry com backoff
- `circuit-breaker.ts` - Circuit breaker

## Cobertura de Testes

**84 arquivos de teste** - Todos os utilitários testados!

---

*Atualizado em 10/01/2026*

