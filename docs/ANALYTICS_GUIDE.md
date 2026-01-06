# 📊 Analytics Guide - Projeto VISÃO

## Visão Geral

Sistema de analytics para monitoramento de métricas e KPIs de vigilância.

---

## 1. Dashboard Principal

### KPIs Principais

| KPI | Descrição | Fórmula |
|-----|-----------|---------|
| **Alertas/Hora** | Taxa de alertas | `total_alertas / horas` |
| **Tempo de Resposta** | Média de resposta | `sum(tempo_resposta) / count` |
| **Detecções** | Total de detecções | `count(detections)` |
| **Uptime Câmeras** | Disponibilidade | `(online / total) * 100` |

### Widgets Disponíveis

```typescript
interface DashboardWidget {
  type: 'stat' | 'chart' | 'table' | 'map';
  title: string;
  dataSource: string;
  refreshInterval: number; // segundos
}
```

---

## 2. Métricas de Reconhecimento Facial

### Métricas Coletadas

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `recognition_count` | Counter | Total de reconhecimentos |
| `recognition_latency` | Histogram | Tempo de processamento |
| `match_confidence` | Gauge | Confiança média |
| `false_positive_rate` | Gauge | Taxa de falsos positivos |

### Relatórios

1. **Diário**: Resumo de atividades
2. **Semanal**: Tendências e padrões
3. **Mensal**: Análise completa

---

## 3. Métricas de Alertas

### Por Tipo

| Tipo | Código | Prioridade |
|------|--------|------------|
| Intrusão | `intrusion` | 🔴 Alta |
| Blacklist | `blacklist` | 🔴 Alta |
| PPE Ausente | `ppe_missing` | 🟡 Média |
| Permanência | `dwell_time` | 🟡 Média |
| Placa Detectada | `plate_detected` | 🟢 Baixa |

### Dashboard de Alertas

```sql
-- Alertas por hora (últimas 24h)
SELECT 
  date_trunc('hour', created_at) as hora,
  count(*) as total
FROM alerts
WHERE created_at > now() - interval '24 hours'
GROUP BY 1
ORDER BY 1;
```

---

## 4. Heatmap Analytics

### Dados Coletados

- Posição (x, y) normalizada
- Timestamp
- Câmera de origem
- Duração da detecção

### Visualização

```typescript
interface HeatmapData {
  points: Array<{
    x: number;
    y: number;
    value: number;
  }>;
  max: number;
  gradient: Record<number, string>;
}
```

---

## 5. Exportação de Dados

### Formatos Suportados

| Formato | Uso |
|---------|-----|
| CSV | Planilhas |
| JSON | APIs |
| PDF | Relatórios |
| Excel | Análises |

### API de Exportação

```typescript
// Exportar alertas
const response = await exportService.export({
  type: 'alerts',
  format: 'csv',
  dateRange: {
    start: '2026-01-01',
    end: '2026-01-06'
  },
  filters: {
    severity: ['high', 'critical']
  }
});
```

---

## 6. Gráficos Disponíveis

### Tipos

| Tipo | Componente | Uso |
|------|------------|-----|
| Linha | `LineChart` | Tendências |
| Barra | `BarChart` | Comparações |
| Pizza | `PieChart` | Distribuição |
| Área | `AreaChart` | Volume |
| Radar | `RadarChart` | Multimétricas |

### Exemplo

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

<LineChart data={alertsData}>
  <XAxis dataKey="hour" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="count" stroke="#8884d8" />
</LineChart>
```

---

## 7. Performance Metrics

### Métricas de Sistema

| Métrica | Alvo |
|---------|------|
| FPS de Análise | > 15 fps |
| Latência de Detecção | < 200ms |
| Uso de CPU | < 70% |
| Uso de Memória | < 2GB |

---

**Última atualização:** 06/01/2026
