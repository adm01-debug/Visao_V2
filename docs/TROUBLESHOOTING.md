# 🔧 Troubleshooting - Projeto VISÃO

## Problemas Comuns e Soluções

---

## 1. Streaming

### Stream não carrega
**Causa:** CORS ou URL incorreta
**Solução:**
```bash
# Verificar se MediaMTX está rodando
curl http://localhost:8888/v3/paths/list

# Verificar CORS no nginx
add_header Access-Control-Allow-Origin *;
```

### Alta latência
**Causa:** Buffer grande ou rede lenta
**Solução:**
```typescript
const hls = new Hls({
  lowLatencyMode: true,
  liveSyncDuration: 1,
});
```

---

## 2. Reconhecimento Facial

### Baixa precisão
**Causa:** Iluminação ruim ou imagem pequena
**Solução:**
- Melhore iluminação da câmera
- Aumente resolução do stream
- Ajuste threshold: `0.5` → `0.6`

### Modelos não carregam
**Causa:** Path incorreto ou CORS
**Solução:**
```typescript
await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
// Verificar se arquivos existem em public/models/
```

---

## 3. Autenticação

### Login falha
**Causa:** Credenciais ou Supabase config
**Solução:**
```bash
# Verificar variáveis
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### Session expira rápido
**Causa:** Refresh token não está funcionando
**Solução:**
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token atualizado');
  }
});
```

---

## 4. Build

### Build falha
**Causa:** Tipos ou dependências
**Solução:**
```bash
# Limpar cache
rm -rf node_modules/.vite
npm run typecheck
npm run build
```

### Out of memory
**Solução:**
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## 5. Database

### Migration falha
**Causa:** Conflito ou sintaxe
**Solução:**
```bash
supabase db reset
supabase db push
```

### RLS bloqueia acesso
**Solução:**
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'cameras';
```

---

## 6. Notificações

### Push não funciona
**Causa:** Service Worker ou permissão
**Solução:**
```javascript
// Verificar permissão
const permission = await Notification.requestPermission();
console.log('Permission:', permission);
```

### Telegram não envia
**Causa:** Bot token ou chat_id
**Solução:**
```bash
# Testar bot
curl "https://api.telegram.org/bot$TOKEN/getMe"
```

---

## 7. Performance

### UI lenta
**Causa:** Re-renders excessivos
**Solução:**
```typescript
// Use React.memo
export const Component = React.memo(({ data }) => {
  // ...
});
```

### CPU alta
**Causa:** Muitos streams ou análise
**Solução:**
- Reduza FPS de análise
- Use hardware acceleration
- Limite câmeras simultâneas

---

## 8. Logs

```bash
# Browser console
localStorage.setItem('debug', 'visao:*');

# Supabase logs
supabase functions logs --tail
```

---

**Última atualização:** 06/01/2026
