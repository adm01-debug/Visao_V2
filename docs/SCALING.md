# 📈 Scaling Guide - Projeto VISÃO

## Estratégias de Escalabilidade

---

## 1. Escalabilidade Horizontal

### Load Balancer

```nginx
upstream visao_app {
    least_conn;
    server app1:3000;
    server app2:3000;
    server app3:3000;
}
```

### Auto Scaling

| Métrica | Scale Up | Scale Down |
|---------|----------|------------|
| CPU | > 70% | < 30% |
| Memory | > 80% | < 40% |
| Requests | > 1000/s | < 200/s |

---

## 2. Database Scaling

### Read Replicas

```sql
-- Primary: writes
-- Replicas: reads

-- Supabase connection pooling
[db.pooler.supabase.com]:6543
```

### Índices Recomendados

```sql
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_camera ON alerts(camera_id);
CREATE INDEX idx_recognition_person ON recognition_logs(person_id);
```

---

## 3. Caching

### Redis

```typescript
const cache = new Redis({
  host: 'redis',
  port: 6379,
});

// Cache de configurações
await cache.setex('cameras:list', 300, JSON.stringify(cameras));
```

### Cache Strategy

| Dado | TTL | Invalidação |
|------|-----|-------------|
| Configurações | 5 min | On change |
| Face encodings | 1 hora | On update |
| Dashboard stats | 30s | Automático |

---

## 4. Queue Processing

### Background Jobs

```typescript
// Bull queue para processamento
const recognitionQueue = new Queue('recognition');

recognitionQueue.process(async (job) => {
  await processRecognition(job.data);
});
```

### Prioridades

| Job | Prioridade | Workers |
|-----|------------|---------|
| Alertas críticos | 1 | 4 |
| Reconhecimento | 2 | 2 |
| Relatórios | 3 | 1 |

---

## 5. CDN

### Static Assets

```
CDN → /assets/
CDN → /models/ (face-api.js models)
CDN → /images/
```

### Edge Caching

| Path | Cache-Control |
|------|---------------|
| `/assets/*` | max-age=31536000 |
| `/index.html` | no-cache |
| `/api/*` | no-store |

---

## 6. Microservices

### Arquitetura

```
┌─────────────┐
│   Gateway   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──┴──┐ ┌──┴──┐
│ API │ │ WS  │
└──┬──┘ └──┬──┘
   │       │
┌──┴───────┴──┐
│  Services   │
├─────────────┤
│ Recognition │
│ Alerts      │
│ Streaming   │
│ Analytics   │
└─────────────┘
```

---

## 7. Performance Tips

### Frontend

- Code splitting por rota
- Lazy loading de componentes
- Virtual scrolling para listas
- Image optimization

### Backend

- Connection pooling
- Query optimization
- Batch operations
- Async processing

---

## 8. Limites de Escalabilidade

| Cenário | Capacidade |
|---------|------------|
| Single server | 4-8 câmeras |
| Small cluster | 16-32 câmeras |
| Medium cluster | 64-128 câmeras |
| Large cluster | 256+ câmeras |

---

**Última atualização:** 06/01/2026
