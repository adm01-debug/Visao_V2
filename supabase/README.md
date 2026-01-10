# 🗄️ Supabase - Backend do VISÃO

## Estrutura

```
supabase/
├── functions/        # 10 Edge Functions
├── migrations/       # 19 migrações SQL
└── config.toml       # Configuração
```

## Edge Functions (10)

### 🤖 IA e Detecção
- `analyze-image/` - Análise de imagens com IA
- `detect-faces/` - Detecção de rostos
- `compare-faces/` - Comparação facial
- `generate-face-encoding/` - Encoding facial
- `analyze-license-plate/` - Leitura de placas

### 🔔 Notificações
- `send-alert-notification/` - Envio de alertas
- `send-telegram/` - Integração Telegram

### 🔧 Sistema
- `check-ip/` - Verificação de IP
- `get-mapbox-token/` - Token do Mapbox
- `process-automation-rules/` - Processamento de regras

### 📁 Compartilhado
- `_shared/` - Utilitários compartilhados

## Migrações (19)

### Estrutura Base
- `00001_consolidated_all_gaps.sql` - Schema consolidado
- `00002_storage_buckets.sql` - Buckets de storage
- `00003_notification_config.sql` - Configuração de notificações

### Features
- `20251219_clips.sql` - Clipes de vídeo
- `20251219_continuous_analysis.sql` - Análise contínua
- `20251219_facial_recognition.sql` - Reconhecimento facial
- `20251219_streaming_support.sql` - Suporte a streaming
- `20251219_zones.sql` - Zonas de detecção
- `20251220_ppe_heatmap_tables.sql` - EPIs e heatmap

## Deploy

```bash
# Deploy de função específica
supabase functions deploy analyze-image

# Deploy de todas
supabase functions deploy

# Aplicar migrações
supabase db push
```

---

*Atualizado em 10/01/2026*

