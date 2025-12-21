# 📊 Database Schema - VISÃO

## Tabelas Principais

### cameras
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Primary key |
| name | text | Nome da câmera |
| url | text | URL do stream |
| location | text | Localização |
| status | text | online/offline |
| created_at | timestamp | Data criação |

### alerts
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Primary key |
| camera_id | uuid | FK cameras |
| type | text | Tipo do alerta |
| severity | text | low/medium/high/critical |
| message | text | Mensagem |
| acknowledged | boolean | Confirmado |
| created_at | timestamp | Data criação |

### people
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Primary key |
| name | text | Nome |
| face_encoding | jsonb | Encoding facial |
| group_name | text | Grupo |
| created_at | timestamp | Data criação |

### zones
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Primary key |
| camera_id | uuid | FK cameras |
| name | text | Nome da zona |
| points | jsonb | Polígono |
| type | text | Tipo da zona |

### rules
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Primary key |
| name | text | Nome da regra |
| conditions | jsonb | Condições |
| actions | jsonb | Ações |
| enabled | boolean | Ativa |

### plate_detections
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Primary key |
| camera_id | uuid | FK cameras |
| plate_number | text | Número placa |
| confidence | float | Confiança |
| image_url | text | Imagem |

### notification_configs
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Primary key |
| user_id | uuid | FK users |
| channel | text | telegram/email/webhook |
| config | jsonb | Configurações |
| enabled | boolean | Ativo |

## Row Level Security (RLS)
Todas as tabelas possuem RLS habilitado para segurança multi-tenant.

## Índices
- cameras(status)
- alerts(camera_id, created_at)
- people(name)
- plate_detections(plate_number)
