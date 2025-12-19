# 🎬 VISÃO - Guia de Deploy Completo

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Aplicar Migrations](#1-aplicar-migrations)
3. [Deploy Edge Functions](#2-deploy-edge-functions)
4. [Configurar Storage](#3-configurar-storage)
5. [Integrar Câmeras](#4-integrar-câmeras)
6. [Configurar Notificações](#5-configurar-notificações)
7. [Variáveis de Ambiente](#6-variáveis-de-ambiente)
8. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

- Node.js 18+
- Supabase CLI instalado (`npm install -g supabase`)
- Projeto Supabase configurado
- Acesso ao Lovable (para deploy)

```bash
# Verificar instalação
supabase --version
node --version
```

---

## 1. Aplicar Migrations

### Opção A: Via Supabase CLI

```bash
# Na raiz do projeto
cd vis-o

# Linkar projeto Supabase
supabase link --project-ref SEU_PROJECT_REF

# Aplicar todas as migrations
supabase db push
```

### Opção B: Via Dashboard Supabase

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Execute os arquivos em ordem:
   - `00001_consolidated_all_gaps.sql`
   - `00002_storage_buckets.sql`
   - `00003_notification_config.sql`

### Verificar Migrations

```sql
-- No SQL Editor, execute:
SELECT * FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Deve listar:
-- alerts, cameras, rules, analysis_history, analysis_sessions,
-- continuous_analysis_configs, face_recognition_configs,
-- notification_configs, notification_history, notification_templates,
-- recognition_logs, recording_configs, registered_persons,
-- video_clips, zone_events, zones
```

---

## 2. Deploy Edge Functions

### Via Supabase CLI

```bash
# Deploy todas as functions
supabase functions deploy analyze-image
supabase functions deploy detect-faces
supabase functions deploy generate-face-encoding
supabase functions deploy send-alert-notification
supabase functions deploy get-mapbox-token

# Ou deploy de todas de uma vez
supabase functions deploy
```

### Configurar Secrets

```bash
# Configurar LOVABLE_API_KEY (obrigatório para IA)
supabase secrets set LOVABLE_API_KEY=sua_chave_aqui

# Configurar Resend (para emails)
supabase secrets set RESEND_API_KEY=sua_chave_resend

# Configurar WhatsApp (opcional)
supabase secrets set WHATSAPP_API_URL=https://sua-api-evolution.com
supabase secrets set WHATSAPP_API_KEY=sua_chave
supabase secrets set WHATSAPP_INSTANCE=sua_instancia

# Configurar Mapbox (para mapas)
supabase secrets set MAPBOX_ACCESS_TOKEN=seu_token_mapbox
```

### Verificar Functions

```bash
# Listar functions deployadas
supabase functions list

# Testar uma function
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/analyze-image \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "...", "analysisType": "security"}'
```

---

## 3. Configurar Storage

Os buckets são criados automaticamente pela migration `00002_storage_buckets.sql`.

### Buckets Criados

| Bucket | Público | Tamanho Máx | Uso |
|--------|---------|-------------|-----|
| `clips` | ✅ | 100MB | Vídeos gravados |
| `face-photos` | ✅ | 10MB | Fotos de pessoas |
| `snapshots` | ✅ | 5MB | Capturas de tela |
| `analysis-results` | ❌ | 20MB | Resultados de IA |

### Verificar no Dashboard

1. Vá em **Storage** no Supabase Dashboard
2. Verifique se os 4 buckets estão listados
3. Teste upload de um arquivo em cada bucket

---

## 4. Integrar Câmeras

### Formatos Suportados

| Protocolo | URL Exemplo | Uso |
|-----------|-------------|-----|
| HLS | `https://camera.local/live/stream.m3u8` | IP Cameras, DVRs |
| RTSP | `rtsp://user:pass@camera.local:554/stream` | Câmeras IP |
| MJPEG | `http://camera.local/mjpeg` | Webcams |
| WebRTC | WebRTC signaling server | Baixa latência |

### Cadastrar Câmera via SQL

```sql
INSERT INTO cameras (name, location, status, stream_url, stream_protocol)
VALUES (
  'Câmera Entrada',
  'Portaria Principal',
  'active',
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  'hls'
);
```

### Câmeras Demo para Teste

```sql
-- Inserir câmeras de demonstração
INSERT INTO cameras (name, location, status, stream_url, stream_protocol) VALUES
('Demo - Big Buck Bunny', 'Teste HLS', 'active', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'hls'),
('Demo - Tears of Steel', 'Teste HLS 2', 'active', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 'hls');
```

### Integrações Populares

#### Hikvision
```
RTSP: rtsp://admin:senha@192.168.1.64:554/Streaming/Channels/101
```

#### Intelbras
```
RTSP: rtsp://admin:senha@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0
```

#### Dahua
```
RTSP: rtsp://admin:senha@192.168.1.108:554/cam/realmonitor?channel=1&subtype=1
```

#### DVR/NVR Genérico
Normalmente disponibiliza HLS via porta HTTP (ex: 8080)
```
HLS: http://192.168.1.50:8080/live/ch01.m3u8
```

### Converter RTSP para HLS

Se sua câmera só tem RTSP, use um servidor de conversão:

#### Opção 1: MediaMTX (recomendado)
```bash
docker run --rm -it -p 8554:8554 -p 8888:8888 bluenviron/mediamtx

# Adicionar câmera RTSP
# Acesse http://localhost:8888 para stream HLS
```

#### Opção 2: FFmpeg + Nginx
```bash
ffmpeg -i rtsp://camera_url -c:v copy -f hls /var/www/html/stream.m3u8
```

---

## 5. Configurar Notificações

### Via SQL

```sql
-- Criar configuração de notificação
INSERT INTO notification_configs (
  name,
  enabled,
  channels,
  severity_filter,
  email_recipients,
  phone_recipients
) VALUES (
  'Alertas Críticos - Equipe Segurança',
  true,
  '{"email", "whatsapp"}',
  '{"high", "critical"}',
  '{"seguranca@empresa.com", "supervisor@empresa.com"}',
  '{"5511999999999", "5511888888888"}'
);
```

### Configurar Email (Resend)

1. Crie conta em [resend.com](https://resend.com)
2. Obtenha API Key
3. Configure no Supabase:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Configurar WhatsApp (Evolution API)

1. Configure Evolution API ou Z-API
2. Crie instância e conecte WhatsApp
3. Configure no Supabase:
```bash
supabase secrets set WHATSAPP_API_URL=https://api.evolution.com.br
supabase secrets set WHATSAPP_API_KEY=sua_chave
supabase secrets set WHATSAPP_INSTANCE=visao_producao
```

---

## 6. Variáveis de Ambiente

### Supabase Secrets (Edge Functions)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `LOVABLE_API_KEY` | ✅ | API Key do Lovable para IA |
| `RESEND_API_KEY` | ❌ | API Key do Resend para emails |
| `WHATSAPP_API_URL` | ❌ | URL da API WhatsApp |
| `WHATSAPP_API_KEY` | ❌ | Chave da API WhatsApp |
| `WHATSAPP_INSTANCE` | ❌ | Nome da instância WhatsApp |
| `MAPBOX_ACCESS_TOKEN` | ❌ | Token do Mapbox para mapas |

### Frontend (.env.local)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Troubleshooting

### Erro: "LOVABLE_API_KEY not configured"

```bash
supabase secrets set LOVABLE_API_KEY=sua_chave
supabase functions deploy analyze-image
```

### Erro: "Rate limit exceeded"

A API de IA tem limite de requisições. Aumente o intervalo de análise:
- Mínimo recomendado: 5 segundos entre análises

### Stream não carrega

1. Verifique se a URL está acessível
2. Teste no VLC: `vlc https://url-do-stream.m3u8`
3. Verifique CORS se for HLS

### Notificações não chegam

1. Verifique se a configuração está `enabled = true`
2. Verifique filtro de severidade
3. Verifique cooldown (padrão 5 minutos)
4. Consulte logs: `supabase functions logs send-alert-notification`

---

## 📊 Resumo de Arquivos

```
supabase/
├── migrations/
│   ├── 00001_consolidated_all_gaps.sql   # Todas as tabelas
│   ├── 00002_storage_buckets.sql         # Buckets de storage
│   └── 00003_notification_config.sql     # Sistema de notificações
└── functions/
    ├── analyze-image/                     # Análise de IA
    ├── detect-faces/                      # Detecção facial
    ├── generate-face-encoding/            # Encoding facial
    ├── send-alert-notification/           # Envio de alertas
    └── get-mapbox-token/                  # Token do mapa
```

---

## 🚀 Checklist Final

- [ ] Migrations aplicadas
- [ ] Edge Functions deployadas
- [ ] Secrets configurados (LOVABLE_API_KEY)
- [ ] Buckets de storage criados
- [ ] Câmera de teste cadastrada
- [ ] Notificação de teste configurada
- [ ] Primeiro alerta gerado e notificado

---

**VISÃO** - Sistema de Vigilância Inteligente
Desenvolvido com excelência 🏆
