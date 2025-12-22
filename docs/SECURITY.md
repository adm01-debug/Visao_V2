# Security Guide - VISÃO

## Práticas de Segurança

### Autenticação
- Supabase Auth com JWT
- Tokens renovados automaticamente
- Sessões gerenciadas pelo cliente

### Autorização
- Row Level Security (RLS) no Supabase
- Policies por usuário/organização
- Validação server-side em Edge Functions

### Dados Sensíveis
- Senhas nunca armazenadas em texto plano
- API keys em variáveis de ambiente
- Dados pessoais criptografados

### Validação
- Input validation em todos os endpoints
- Sanitização de HTML/XSS
- Rate limiting em APIs

### Headers de Segurança
- CSP configurado
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

## Reportar Vulnerabilidades
Envie para: security@example.com
