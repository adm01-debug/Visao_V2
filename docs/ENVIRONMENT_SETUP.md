# ⚙️ Configuração de Ambiente

## Variáveis de Ambiente

### Desenvolvimento (.env.development)

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_MAPBOX_TOKEN=pk.xxx
VITE_API_URL=http://localhost:3000
```

### Produção (.env.production)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_MAPBOX_TOKEN=pk.xxx
VITE_API_URL=https://api.visao.app
```

## Supabase

### Iniciar Supabase Local

```bash
supabase start
```

### Variáveis Geradas

```
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio: http://localhost:54323
Anon key: eyJhbGc...
Service role key: eyJhbGc...
```

## MediaMTX (Streaming)

### Docker Compose

```yaml
services:
  mediamtx:
    image: bluenviron/mediamtx:latest
    ports:
      - "8554:8554"  # RTSP
      - "8888:8888"  # HLS
    volumes:
      - ./mediamtx.yml:/mediamtx.yml
```

### mediamtx.yml

```yaml
paths:
  all:
    record: yes
    recordPath: ./recordings/%path/%Y-%m-%d_%H-%M-%S.mp4
```

## Secrets (GitHub Actions)

| Secret | Descrição |
|--------|-----------|
| SUPABASE_URL | URL do Supabase |
| SUPABASE_ANON_KEY | Chave anônima |
| SUPABASE_SERVICE_KEY | Chave de serviço |
| MAPBOX_TOKEN | Token do Mapbox |
| VERCEL_TOKEN | Deploy Vercel |

## Verificar Configuração

```bash
# Verificar variáveis
npm run env:check

# Testar conexão Supabase
npm run db:test
```
