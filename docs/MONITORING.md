# 📊 Monitoring Guide - Projeto VISÃO

## Visão Geral

Monitoramento de saúde, performance e métricas do sistema VISÃO.

---

## 1. Health Checks

### Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `/health` | Status geral |
| `/health/live` | Liveness probe |
| `/health/ready` | Readiness probe |

### Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-06T12:00:00Z",
  "services": {
    "database": "up",
    "redis": "up",
    "mediamtx": "up"
  },
  "version": "11.1.0"
}
```

---

## 2. Métricas de Sistema

### Recursos

| Métrica | Alvo | Crítico |
|---------|------|---------|
| CPU | < 70% | > 90% |
| RAM | < 80% | > 95% |
| Disk | < 80% | > 95% |
| Network | < 70% | > 90% |

### Coletores

```typescript
// Performance monitoring
const metrics = {
  fps: performance.now(),
  memory: performance.memory?.usedJSHeapSize,
  timing: performance.timing,
};
```

---

## 3. Application Metrics

### React Performance

| Métrica | Descrição |
|---------|-----------|
| Render time | Tempo de renderização |
| Component mounts | Montagens de componente |
| Re-renders | Re-renderizações |
| Hydration | Tempo de hidratação |

### API Metrics

| Métrica | Descrição |
|---------|-----------|
| Request latency | Latência de requisição |
| Error rate | Taxa de erros |
| Throughput | Requisições/segundo |
| Queue depth | Fila de processamento |

---

## 4. Logging

### Níveis

| Nível | Uso |
|-------|-----|
| ERROR | Erros críticos |
| WARN | Alertas |
| INFO | Informações gerais |
| DEBUG | Desenvolvimento |
| TRACE | Detalhado |

### Formato

```json
{
  "timestamp": "2026-01-06T12:00:00Z",
  "level": "INFO",
  "service": "recognition",
  "message": "Face detected",
  "metadata": {
    "cameraId": "uuid",
    "confidence": 0.95
  }
}
```

---

## 5. Alertas

### Configuração

| Condição | Severidade | Ação |
|----------|------------|------|
| CPU > 90% | Critical | Page on-call |
| Error rate > 5% | High | Slack + Email |
| Latency > 2s | Medium | Slack |
| Disk > 80% | Low | Email |

### Canais

- Slack
- Email
- PagerDuty
- Telegram

---

## 6. Dashboards

### Grafana

```yaml
# Métricas sugeridas
- System overview
- API performance
- Recognition metrics
- Alert statistics
- Camera status
```

### Datadog

```yaml
# APM Configuration
DD_APM_ENABLED: true
DD_TRACE_SAMPLE_RATE: 1.0
DD_SERVICE: visao
```

---

## 7. Tracing

### OpenTelemetry

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('visao');
const span = tracer.startSpan('face-detection');
// ... operação
span.end();
```

---

## 8. Sentry (Error Tracking)

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://xxx@sentry.io/xxx',
  environment: 'production',
  tracesSampleRate: 0.1,
});
```

---

## 9. Uptime Monitoring

| Serviço | Check Interval |
|---------|----------------|
| App | 1 min |
| API | 30s |
| Database | 1 min |
| MediaMTX | 30s |

---

**Última atualização:** 06/01/2026
