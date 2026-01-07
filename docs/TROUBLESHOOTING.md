# 🔧 Troubleshooting Guide - Projeto VISÃO

## Problemas Comuns e Soluções

---

## 1. Stream não carrega

**Sintoma:** Câmera não exibe vídeo

**Soluções:**
- Verificar URL RTSP
- Checar firewall/CORS
- Testar com VLC
- Verificar MediaMTX

```bash
# Testar RTSP
ffprobe rtsp://ip:554/stream
```

---

## 2. Reconhecimento não funciona

**Sintoma:** Faces não detectadas

**Soluções:**
- Verificar modelos carregados
- Checar iluminação
- Ajustar threshold
- Verificar console

```typescript
// Verificar modelos
await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
```

---

## 3. Login falha

**Sintoma:** Erro de autenticação

**Soluções:**
- Verificar credenciais
- Checar Supabase URL/Key
- Limpar localStorage
- Verificar RLS

---

## 4. Build falha

**Sintoma:** Erro no npm run build

**Soluções:**
```bash
# Limpar cache
rm -rf node_modules
npm cache clean --force
npm install

# Verificar tipos
npm run typecheck
```

---

## 5. Alta latência

**Sintoma:** Stream com delay

**Soluções:**
- Usar WebRTC em vez de HLS
- Reduzir qualidade
- Verificar rede
- Aumentar buffer

---

## 6. Notificações não chegam

**Sintoma:** Push/Telegram não funciona

**Soluções:**
- Verificar permissões
- Checar token do bot
- Verificar chat_id
- Testar webhook

---

## 7. Erro 401/403

**Sintoma:** Acesso negado

**Soluções:**
- Token expirado → re-login
- RLS policy → verificar
- CORS → configurar

---

## 8. PWA não instala

**Sintoma:** Opção de instalação não aparece

**Soluções:**
- Usar HTTPS
- Verificar manifest.json
- Checar service worker
- Limpar cache

---

## 9. Performance lenta

**Sintoma:** UI travando

**Soluções:**
- Reduzir câmeras ativas
- Habilitar hardware acceleration
- Limpar gravações antigas
- Verificar DevTools Performance

---

## 10. Logs e Debug

```typescript
// Habilitar debug
localStorage.setItem('debug', 'visao:*');

// Ver logs no console
console.log('[VISAO]', data);
```

---

## Contato

- Issues: GitHub
- Email: support@visao.app

---

**Última atualização:** 06/01/2026
