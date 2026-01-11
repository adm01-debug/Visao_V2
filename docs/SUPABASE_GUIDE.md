# 🗄️ Guia do Supabase

## Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| cameras | Cadastro de câmeras |
| alerts | Alertas gerados |
| alert_rules | Regras de automação |
| zones | Zonas de interesse |
| zone_events | Eventos em zonas |
| faces | Faces cadastradas |
| face_encodings | Encodings faciais |
| analysis_results | Resultados de análise |
| clips | Clipes de vídeo |
| settings | Configurações |

## Edge Functions

### analyze-image
Análise de imagem com Google Vision.

```bash
supabase functions invoke analyze-image --body '{"imageUrl": "..."}'
```

### detect-faces
Detecção facial em imagens.

### compare-faces
Comparação de faces.

### check-ip
Verificação de IP para whitelist.

## RLS (Row Level Security)

Todas as tabelas têm RLS habilitado:

```sql
-- Exemplo: cameras
CREATE POLICY "Users can view own cameras"
  ON cameras FOR SELECT
  USING (auth.uid() = user_id);
```

## Realtime

Subscriptions habilitadas:

```typescript
supabase
  .channel('alerts')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'alerts' },
    (payload) => handleNewAlert(payload.new)
  )
  .subscribe();
```

## Storage Buckets

| Bucket | Uso |
|--------|-----|
| camera-snapshots | Capturas de câmera |
| face-images | Imagens faciais |
| clips | Clipes de vídeo |
| exports | Relatórios exportados |

## Migrations

```bash
# Criar migration
supabase migration new add_column

# Aplicar migrations
supabase db push

# Resetar banco
supabase db reset
```

## Tipos TypeScript

```bash
# Gerar tipos
npm run db:generate
```

Arquivo gerado: `src/types/database.ts`
