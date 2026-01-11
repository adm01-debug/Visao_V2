# 🚀 Guia de Deploy Avançado

## Ambientes

| Ambiente | Branch | URL |
|----------|--------|-----|
| Development | develop | localhost:5173 |
| Staging | staging | staging.visao.app |
| Production | main | app.visao.app |

## Vercel

### Configuração

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install --legacy-peer-deps",
  "framework": "vite"
}
```

### Variáveis de Ambiente

Configurar no dashboard do Vercel:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_MAPBOX_TOKEN

## Docker

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  location /api {
    proxy_pass https://xxx.supabase.co;
  }
}
```

## Kubernetes

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: visao
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: visao
        image: visao:latest
        ports:
        - containerPort: 80
```

## CI/CD

### GitHub Actions

O pipeline executa:
1. Install dependencies
2. Type check
3. Lint
4. Test
5. Build
6. Deploy

## Rollback

```bash
# Vercel
vercel rollback

# Kubernetes
kubectl rollout undo deployment/visao
```

## Monitoramento

- Vercel Analytics
- Supabase Dashboard
- Sentry (erros)
- Lighthouse CI
