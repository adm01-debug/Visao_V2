# 🔄 Migration Guide - Projeto VISÃO

## Visão Geral

Guia para migrações de banco de dados e atualizações de versão.

---

## 1. Database Migrations

### Estrutura

```
supabase/migrations/
├── 00001_consolidated_all_gaps.sql
├── 00002_storage_buckets.sql
├── 00003_notification_config.sql
├── 20251219_facial_recognition.sql
├── 20251219_zones.sql
├── 20251220_ppe_heatmap_tables.sql
└── ...
```

---

## 2. Comandos

### Criar Migration

```bash
supabase migration new add_user_preferences
```

### Aplicar Migrations

```bash
# Ambiente local
supabase db push

# Produção
supabase db push --linked
```

### Status

```bash
supabase migration list
```

### Rollback

```bash
supabase db reset
```

---

## 3. Exemplo de Migration

```sql
-- supabase/migrations/20260106_add_notifications.sql

-- Criar tabela
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  telegram_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice
CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 4. Tipos TypeScript

### Gerar Tipos

```bash
supabase gen types typescript --local > src/types/supabase.ts
```

### Uso

```typescript
import { Database } from '@/types/supabase';

type Alert = Database['public']['Tables']['alerts']['Row'];
```

---

## 5. Migrations vs Seeds

| Arquivo | Uso |
|---------|-----|
| `migrations/*.sql` | Estrutura (DDL) |
| `seed.sql` | Dados iniciais |

### Seed

```bash
supabase db seed
```

---

## 6. Migrando de Versão

### v10 → v11

1. Backup do banco
2. Atualizar dependências
3. Executar migrations
4. Regenerar tipos
5. Testar

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Update
npm update

# Migrations
supabase db push

# Types
npm run db:generate

# Test
npm run test
```

---

## 7. Rollback de Migration

### Criar Down Migration

```sql
-- 20260106_add_notifications_down.sql
DROP TABLE IF EXISTS notification_preferences;
```

### Aplicar

```bash
psql $DATABASE_URL < migrations/down/20260106_add_notifications_down.sql
```

---

## 8. Boas Práticas

| Prática | Descrição |
|---------|-----------|
| Idempotente | Use `IF NOT EXISTS` |
| Reversível | Sempre crie down migration |
| Pequenas | Uma mudança por migration |
| Testada | Teste localmente antes |

---

## 9. Troubleshooting

| Problema | Solução |
|----------|---------|
| Migration falhou | Verificar logs, corrigir SQL |
| Tipos desatualizados | `npm run db:generate` |
| Conflito de foreign key | Verificar ordem das migrations |

---

**Última atualização:** 06/01/2026
