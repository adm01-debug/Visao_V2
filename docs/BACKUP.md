# 💾 Backup Guide - Projeto VISÃO

## Visão Geral

Estratégias de backup para dados do sistema VISÃO.

---

## 1. Componentes para Backup

| Componente | Tipo | Frequência |
|------------|------|------------|
| Database (Supabase) | PostgreSQL | Diário |
| Gravações | Vídeo/MP4 | Contínuo |
| Face Encodings | Binary | Semanal |
| Configurações | JSON | Por alteração |

---

## 2. Backup do Database

### Via Supabase Dashboard

1. Acesse o projeto no Supabase
2. Settings → Database
3. Backups → Download

### Via CLI

```bash
# Backup completo
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

# Backup comprimido
pg_dump -h db.xxx.supabase.co -U postgres -d postgres | gzip > backup.sql.gz
```

### Restauração

```bash
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## 3. Backup de Gravações

### Local Storage

```bash
# Sincronizar para disco externo
rsync -avz /var/visao/recordings/ /mnt/backup/recordings/
```

### Cloud Storage (S3)

```bash
# AWS CLI
aws s3 sync /var/visao/recordings/ s3://visao-backup/recordings/

# Rclone
rclone sync /var/visao/recordings/ s3:visao-backup/recordings/
```

### Política de Retenção

| Tipo | Retenção |
|------|----------|
| Alertas | 90 dias |
| Contínuo | 30 dias |
| Clips | 180 dias |

---

## 4. Backup de Face Encodings

```typescript
// Export encodings
const encodings = await db.from('face_encodings').select('*');
fs.writeFileSync('encodings.json', JSON.stringify(encodings));
```

---

## 5. Backup de Configurações

### Export via API

```typescript
const config = await configService.exportAll();
fs.writeFileSync('config-backup.json', JSON.stringify(config, null, 2));
```

### Arquivos incluídos

- Configurações de câmeras
- Zonas de monitoramento
- Regras de alerta
- Configurações de notificação
- Preferências de usuário

---

## 6. Backup Automatizado

### Cron Job

```bash
# /etc/cron.d/visao-backup

# Database - diário às 2h
0 2 * * * root /opt/visao/scripts/backup-db.sh

# Gravações - a cada 6h
0 */6 * * * root /opt/visao/scripts/backup-recordings.sh

# Configurações - diário às 3h
0 3 * * * root /opt/visao/scripts/backup-config.sh
```

### Script de Backup

```bash
#!/bin/bash
# /opt/visao/scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/visao/backups

pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Manter apenas últimos 30 dias
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

---

## 7. Disaster Recovery

### RTO/RPO

| Métrica | Alvo |
|---------|------|
| RTO (Recovery Time) | < 4 horas |
| RPO (Recovery Point) | < 1 hora |

### Procedimento de Recuperação

1. Provisionar nova infraestrutura
2. Restaurar database do último backup
3. Sincronizar gravações do cloud storage
4. Reimportar face encodings
5. Aplicar configurações
6. Validar funcionamento

---

## 8. Monitoramento de Backups

### Alertas

| Condição | Ação |
|----------|------|
| Backup falhou | Notificar admin |
| Backup atrasado > 24h | Alerta crítico |
| Espaço < 10% | Alerta de storage |

---

## 9. Criptografia

```bash
# Backup criptografado
pg_dump $DATABASE_URL | gzip | gpg -c -o backup.sql.gz.gpg

# Restaurar
gpg -d backup.sql.gz.gpg | gunzip | psql $DATABASE_URL
```

---

**Última atualização:** 06/01/2026
