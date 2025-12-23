# ⚡ Edge Functions - VISÃO

## Funções Disponíveis

| Função | Propósito |
|--------|-----------|
| `analyze-image` | Análise de imagens com IA |
| `analyze-license-plate` | OCR de placas |
| `compare-faces` | Comparação facial |
| `detect-faces` | Detecção de faces |
| `generate-face-encoding` | Encoding facial |
| `send-alert-notification` | Envio de alertas |
| `send-telegram` | Notificações Telegram |
| `get-mapbox-token` | Token Mapbox |

## Estrutura

```
supabase/functions/
├── _shared/
│   └── validation.ts
├── analyze-image/
│   └── index.ts
└── ...
```

## Deploy

```bash
supabase functions deploy
```

## Testes Locais

```bash
supabase functions serve
```

## Logs

```bash
supabase functions logs analyze-image
```

