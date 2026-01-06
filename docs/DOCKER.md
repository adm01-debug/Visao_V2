# 🐳 Docker Guide - Projeto VISÃO

## Visão Geral

Containerização do sistema VISÃO com Docker e Docker Compose.

---

## 1. Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 2. Docker Compose

### Desenvolvimento

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    command: npm run dev -- --host

  mediamtx:
    image: bluenviron/mediamtx:latest
    ports:
      - "8554:8554"
      - "8888:8888"
      - "8889:8889"
    volumes:
      - ./mediamtx.yml:/mediamtx.yml
```

### Produção

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    restart: always
    
  mediamtx:
    image: bluenviron/mediamtx:latest
    ports:
      - "8554:8554"
      - "8888:8888"
    restart: always
```

---

## 3. Comandos

### Build

```bash
# Build image
docker build -t visao:latest .

# Build com tag
docker build -t visao:v11.1.0 .
```

### Run

```bash
# Desenvolvimento
docker compose -f docker-compose.dev.yml up

# Produção
docker compose -f docker-compose.prod.yml up -d
```

### Logs

```bash
docker compose logs -f app
```

### Shell

```bash
docker compose exec app sh
```

---

## 4. Multi-stage Build

```dockerfile
# Otimização de tamanho
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Image final: ~30MB
```

---

## 5. Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1
```

---

## 6. Variáveis de Ambiente

```env
# .env.docker
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_MEDIAMTX_URL=http://mediamtx:8888
```

---

## 7. Volumes

| Volume | Descrição |
|--------|-----------|
| `/app/recordings` | Gravações de vídeo |
| `/app/logs` | Logs da aplicação |
| `/app/models` | Modelos de IA |

---

## 8. Registry

```bash
# Tag para registry
docker tag visao:latest registry.example.com/visao:latest

# Push
docker push registry.example.com/visao:latest
```

---

**Última atualização:** 06/01/2026
