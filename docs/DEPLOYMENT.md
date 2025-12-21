# 🚀 Guia de Deploy - VISÃO

Este documento descreve como fazer deploy do sistema VISÃO em diferentes ambientes.

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Docker (opcional)
- Conta Supabase configurada
- Servidor com SSL (produção)

## ⚡ Deploy Rápido (Vercel/Netlify)

### Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify

```bash
# Build
npm run build

# Deploy via Netlify CLI ou arrastar pasta dist/ para dashboard
```

## 🐳 Deploy com Docker

### Build da imagem

```bash
# Build
docker build -t visao:latest .

# Ou usando docker-compose
docker-compose build
```

### Executar container

```bash
# Modo simples
docker run -d -p 80:80 --name visao visao:latest

# Com docker-compose (inclui Nginx)
docker-compose up -d
```

### Variáveis de ambiente

Criar arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_APP_ENV=production
```

## ☁️ Deploy em Cloud Providers

### AWS (S3 + CloudFront)

1. Build do projeto:
```bash
npm run build
```

2. Upload para S3:
```bash
aws s3 sync dist/ s3://seu-bucket-visao --delete
```

3. Configurar CloudFront:
- Origem: bucket S3
- SSL: certificado ACM
- Comportamento: redirecionar para index.html em 404

### Google Cloud (Cloud Run)

```bash
# Build e push
gcloud builds submit --tag gcr.io/projeto/visao

# Deploy
gcloud run deploy visao \
  --image gcr.io/projeto/visao \
  --platform managed \
  --allow-unauthenticated
```

### Azure (Static Web Apps)

```bash
# Via Azure CLI
az staticwebapp create \
  --name visao \
  --resource-group meu-grupo \
  --source https://github.com/seu-usuario/visao \
  --branch main \
  --app-location "/" \
  --output-location "dist"
```

## 🔧 Configuração do Supabase

### 1. Criar projeto

Acesse [supabase.com](https://supabase.com) e crie um novo projeto.

### 2. Executar migrations

```bash
# Via CLI
supabase db push

# Ou execute manualmente os scripts em /supabase/migrations/
```

### 3. Configurar Storage

Criar buckets:
- `recordings` - Clips de vídeo
- `snapshots` - Screenshots
- `faces` - Imagens de rostos

### 4. Configurar Edge Functions

```bash
supabase functions deploy analyze-frame
supabase functions deploy process-alert
```

## 🔐 Segurança em Produção

### Checklist

- [ ] HTTPS habilitado
- [ ] Variáveis de ambiente protegidas
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] Backup automático do banco
- [ ] Logs centralizados
- [ ] Monitoramento de erros (Sentry)

### Headers de segurança (Nginx)

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

## 📊 Monitoramento

### Health Check

O endpoint `/health` retorna status do sistema:

```bash
curl https://seu-dominio.com/health
```

### Métricas recomendadas

- Uptime
- Latência de API
- Uso de CPU/memória
- Erros por minuto
- Conexões WebSocket ativas

## 🔄 CI/CD

O projeto inclui workflow GitHub Actions em `.github/workflows/ci.yml`:

- **Push em main**: Build + Deploy automático
- **Pull Requests**: Lint + Testes
- **Tags v***: Release + Deploy produção

### Secrets necessários

Configure no GitHub:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DEPLOY_TOKEN` (Vercel/Netlify)

## 🆘 Troubleshooting

### Problema: Streaming não funciona

1. Verificar CORS do servidor de mídia
2. Confirmar certificado SSL válido
3. Testar URL do stream diretamente

### Problema: WebSocket desconecta

1. Verificar configuração de proxy
2. Ajustar timeout do Nginx
3. Habilitar keep-alive

### Problema: ML Models não carregam

1. Verificar CDN acessível
2. Testar fallback local
3. Checar console para erros CORS

## 📞 Suporte

- Issues: [GitHub Issues](https://github.com/adm01-debug/vis-o/issues)
- Docs: [Documentação](https://github.com/adm01-debug/vis-o/tree/main/docs)

---

*Última atualização: Dezembro 2025*
