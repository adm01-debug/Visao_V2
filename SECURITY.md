# 🔒 Política de Segurança

## Versões Suportadas

| Versão | Suportada          |
| ------ | ------------------ |
| 1.x.x  | :white_check_mark: |
| < 1.0  | :x:                |

## Reportando Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança:

1. **NÃO** abra uma Issue pública
2. Envie um email para: security@example.com
3. Inclua:
   - Descrição da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Sugestão de correção (se tiver)

## Práticas de Segurança

### Autenticação
- Supabase Auth com Row Level Security (RLS)
- Tokens JWT com expiração
- ProtectedRoute para rotas autenticadas

### Dados Sensíveis
- Nunca commitar `.env`
- Usar variáveis de ambiente
- Credenciais rotacionadas regularmente

### Edge Functions
- Validação de entrada
- Rate limiting
- CORS configurado

### Frontend
- Sanitização de inputs
- CSP headers
- HTTPS obrigatório

## Atualizações de Segurança

Dependências são atualizadas regularmente via:
- Dependabot alerts
- npm audit
- Revisão manual

## Resposta a Incidentes

1. Identificação e isolamento
2. Análise de impacto
3. Correção e deploy
4. Comunicação aos afetados
5. Post-mortem e melhorias
