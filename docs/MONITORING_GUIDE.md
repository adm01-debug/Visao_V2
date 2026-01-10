# 📊 Guia de Monitoramento

## Métricas

### Core Web Vitals
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)

### Aplicação
- Response time
- Error rate
- Throughput
- Active users

## Ferramentas

### Sentry
- Error tracking
- Performance monitoring
- Release tracking

### Prometheus
- Métricas de sistema
- Custom metrics
- Alerting

### Grafana
- Dashboards
- Visualizações
- Alertas

## Alertas Configurados

| Alerta | Threshold | Ação |
|--------|-----------|------|
| Error Rate | >1% | Notifica Slack |
| Response Time | >2s | Notifica email |
| Memory | >80% | Escala automático |
| CPU | >70% | Notifica ops |

## Health Checks

```
GET /health          # Basic health
GET /health/ready    # Ready check
GET /health/live     # Liveness check
```

## Logs

- Structured JSON logging
- Log levels: debug, info, warn, error
- Retention: 30 dias

---

*Atualizado em 10/01/2026*

