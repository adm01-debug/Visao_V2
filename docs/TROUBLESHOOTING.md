# 🔧 Troubleshooting - VISÃO

## Problemas Comuns

### Build falha
```bash
rm -rf node_modules
npm install
npm run build
```

### Supabase não conecta
1. Verificar VITE_SUPABASE_URL
2. Verificar VITE_SUPABASE_PUBLISHABLE_KEY
3. Verificar RLS policies

### Face-api não carrega
```bash
# Verificar se os modelos estão em /public/models/
ls public/models/
```

### Streaming não funciona
1. Verificar MediaMTX rodando
2. Verificar VITE_MEDIAMTX_URL
3. Verificar CORS configurado

### Testes falham
```bash
npm run test -- --clearCache
```

## Logs

### Frontend
- Console do navegador (F12)
- React DevTools

### Backend
- Supabase Dashboard > Logs
- Edge Functions logs

## Suporte

- Issues: GitHub
- Docs: /docs

