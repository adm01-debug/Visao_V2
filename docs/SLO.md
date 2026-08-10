# 📈 Objetivos de Nível de Serviço (SLOs) — VISÃO

Definição de indicadores críticos para garantir a qualidade da experiência do usuário e a confiabilidade do sistema.

## 🚀 Performance (Latência)

| Indicador (SLI)                                 | Alvo (SLO)             | Justificativa                                 |
| ----------------------------------------------- | ---------------------- | --------------------------------------------- |
| **Tempo de Resposta Dashboard**                 | P95 < 2s               | Retenção do usuário e eficiência operacional. |
| **Latência de Alerta (Detecção → Notificação)** | P95 < 5s               | Crítico para segurança em tempo real.         |
| **Carregamento de Stream HLS**                  | P90 < 3s (First Frame) | Experiência de monitoramento fluida.          |

## 🛡️ Confiabilidade (Disponibilidade)

| Indicador (SLI)                     | Alvo (SLO) | Justificativa                                |
| ----------------------------------- | ---------- | -------------------------------------------- |
| **Uptime da API (Edge Functions)**  | 99.5%      | Sistema de segurança não pode ficar offline. |
| **Uptime do Banco de Dados**        | 99.9%      | Persistência de logs e alertas é vital.      |
| **Taxa de Sucesso de Notificações** | > 99%      | Garantir que o alerta chegue ao destino.     |

## 📊 Monitoramento

Os SLOs são monitorados via:

- **Sentry Performance:** Para latência de frontend e edge functions.
- **Better Stack:** Para uptime externo e health checks.
- **Query Telemetry (Tabela):** Para latência de queries SQL complexas.

---

_Última atualização: 2026-05-13_
