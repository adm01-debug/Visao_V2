# Troubleshooting - VISÃO

## Problemas Comuns

### Erro de Conexão Supabase
- Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
- Confirme que o projeto Supabase está ativo

### Câmeras não carregam
- Verifique conexão de rede
- Confirme URLs RTSP/HLS válidas
- Verifique MediaMTX rodando

### Reconhecimento Facial lento
- Modelos face-api.js precisam de GPU
- Considere reduzir resolução de vídeo
- Use WebGL backend

### Build falha
```bash
rm -rf node_modules
npm install
npm run build
```

### Testes falhando
```bash
npm run test -- --clearCache
```

## Logs
- Browser DevTools > Console
- Network tab para APIs
- Supabase Dashboard > Logs
