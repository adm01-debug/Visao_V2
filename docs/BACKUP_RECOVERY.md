# Backup & Recovery Guide

## Overview

Data backup and disaster recovery procedures.

## Database Backup

### Supabase
Supabase handles automatic backups for Pro plans.

### Manual Backup
```bash
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Restore
```bash
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

## Storage Backup

### S3/Supabase Storage
```bash
# Sync to backup bucket
aws s3 sync s3://vis-o-prod s3://vis-o-backup
```

### Local Backup
```bash
# Download all files
supabase storage download -r vis-o-storage ./backup
```

## Configuration Backup

### Environment Variables
- Store in secure vault
- Version control .env.example
- Document all variables

### Secrets
- Use Kubernetes secrets
- AWS Secrets Manager
- HashiCorp Vault

## Recovery Procedures

### Database Recovery
1. Stop application
2. Restore from backup
3. Verify data integrity
4. Restart application

### Full Recovery
1. Provision new infrastructure
2. Restore database
3. Restore storage
4. Configure DNS
5. Verify functionality

## Testing

### Monthly
- Test restore procedure
- Verify backup integrity
- Update documentation

## Contact

Emergency: ops@vis-o.app

---

*Last updated: January 2026*
