# 🔐 Segurança - VISÃO

## Práticas de Segurança

### Autenticação
- Supabase Auth com Row Level Security (RLS)
- JWT tokens com expiração configurável
- Refresh tokens automáticos

### Sanitização
- DOMPurify para HTML
- Validação de inputs com Zod
- Escape de SQL via Supabase client

### Headers de Segurança
```
Content-Security-Policy: default-src self
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

### Variáveis de Ambiente
- Nunca commitar `.env`
- Usar `.env.example` como template
- Secrets no Supabase Dashboard

### Rate Limiting
- Edge Functions com rate limit
- Debounce em inputs de busca
- Throttle em requisições frequentes

## Reportando Vulnerabilidades

Envie para: security@visao.app

