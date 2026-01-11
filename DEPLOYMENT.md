# 🚀 Deployment Guide

Este documento contém as instruções para deploy do VIS-O em diferentes ambientes.

## Opções de Deploy

### 1. Vercel (Recomendado)
```bash
npm i -g vercel
vercel
```

### 2. Netlify
```bash
npm run build
# Upload da pasta dist/
```

### 3. Docker
```bash
docker build -t vis-o .
docker run -p 3000:3000 vis-o
```

### 4. Kubernetes
```bash
kubectl apply -f k8s/
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave
```

## Mais Informações

Consulte a documentação completa em:
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)
- [docs/DOCKER.md](docs/DOCKER.md)
