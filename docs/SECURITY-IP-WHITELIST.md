# 🔒 Sistema de Whitelist de IPs - VISÃO

## Visão Geral

O sistema VISÃO possui um mecanismo robusto de controle de acesso baseado em IP. **Apenas IPs autorizados podem acessar o sistema**.

## 🚀 Configuração Rápida

### 1. Editar o arquivo de configuração

```typescript
// src/config/ipWhitelist.ts

export const IP_WHITELIST_CONFIG = {
  // Ativar/desativar whitelist
  enabled: true,
  
  // Permitir localhost (apenas dev)
  allowLocalhost: false,
  
  // Permitir redes privadas (apenas dev)
  allowPrivateNetworks: false,
  
  // IPs específicos permitidos
  trustedIPs: [
    '203.0.113.50',  // Escritório Principal
    '198.51.100.25', // Filial
  ],
  
  // Ranges de IP (CIDR)
  trustedRanges: [
    '192.0.2.0/24',  // VPN Corporativa
  ],
  
  // IPs bloqueados (prioridade máxima)
  blockedIPs: [],
};
```

### 2. Configurar IPs de Admin

```typescript
// IPs com acesso total (nunca bloqueados)
export const ADMIN_IPS = [
  '203.0.113.1',  // Super Admin
];
```

### 3. Configurar IPs de Produção

```typescript
// IPs fixos da empresa
export const PRODUCTION_WHITELIST = [
  '203.0.113.50',   // Escritório
  '198.51.100.25',  // Filial
  '192.0.2.0/24',   // VPN
];
```

## 📋 Arquivos do Sistema

| Arquivo | Descrição |
|---------|-----------|
| `src/config/ipWhitelist.ts` | Configuração principal |
| `src/lib/ipUtils.ts` | Funções utilitárias de IP |
| `src/middleware/ipWhitelist.ts` | Middleware de verificação |
| `src/hooks/useIPRestriction.ts` | Hook React para verificação |
| `src/providers/SecurityProvider.tsx` | Provider de segurança |
| `src/components/AccessDenied.tsx` | Componente de bloqueio |
| `src/components/admin/IPWhitelistManager.tsx` | Painel de gerenciamento |
| `supabase/functions/check-ip/index.ts` | Edge function |

## 🔧 Uso

### No App.tsx (Provider)

```tsx
import { SecurityProvider } from '@/providers/SecurityProvider';

function App() {
  return (
    <SecurityProvider requireIPCheck={true}>
      <Router>
        {/* Rotas */}
      </Router>
    </SecurityProvider>
  );
}
```

### Em Componentes (Hook)

```tsx
import { useIPRestriction } from '@/hooks/useIPRestriction';

function MyComponent() {
  const { isAllowed, isLoading, clientIP } = useIPRestriction();

  if (isLoading) return <Loading />;
  if (!isAllowed) return <AccessDenied />;

  return <div>Conteúdo protegido</div>;
}
```

### HOC para Proteger Componentes

```tsx
import { withIPRestriction } from '@/hooks/useIPRestriction';

const ProtectedComponent = withIPRestriction(MyComponent);
```

## 🌐 Edge Function

### Deploy

```bash
supabase functions deploy check-ip
```

### Variáveis de Ambiente

```env
TRUSTED_IPS=203.0.113.50,198.51.100.25
BLOCKED_IPS=
ADMIN_IPS=203.0.113.1
ENVIRONMENT=production
```

## ⚙️ Painel de Administração

Acesse `/admin/seguranca/ips` para gerenciar IPs via interface gráfica:

- ✅ Adicionar IPs à whitelist
- 🚫 Bloquear IPs
- 📊 Visualizar tentativas de acesso
- ⚡ Alterações em tempo real

## 🔐 Níveis de Acesso

| Nível | Descrição |
|-------|-----------|
| **Admin** | Acesso total, nunca bloqueado |
| **Trusted** | IP na whitelist |
| **Production** | IP configurado para produção |
| **Private** | Rede privada (se habilitado) |
| **Localhost** | Desenvolvimento local (se habilitado) |
| **Blocked** | IP explicitamente bloqueado |
| **Denied** | IP não autorizado |

## ⚠️ Importante

1. **Sempre inclua seu IP** antes de ativar a whitelist
2. **Configure IPs de admin** para emergências
3. **Teste em staging** antes de ativar em produção
4. **Monitore logs** de tentativas bloqueadas
5. **Tenha um plano B** (acesso SSH, console Supabase)

## 📝 Logs

Todas as tentativas são registradas:

```json
{
  "timestamp": "2024-12-25T10:00:00Z",
  "ip": "203.0.xxx.xxx",
  "allowed": false,
  "reason": "Not in whitelist"
}
```

## 🆘 Troubleshooting

### "Meu IP foi bloqueado"

1. Acesse o console do Supabase
2. Edite as variáveis de ambiente da função
3. Adicione seu IP em `TRUSTED_IPS`
4. Redeploy a função

### "Whitelist não está funcionando"

1. Verifique se `enabled: true` na config
2. Verifique se a edge function está deployada
3. Verifique os logs no Supabase

### "Preciso liberar um range de IPs"

Use notação CIDR em `trustedRanges`:

```typescript
trustedRanges: [
  '192.168.1.0/24',   // 192.168.1.0 - 192.168.1.255
  '10.0.0.0/8',       // 10.0.0.0 - 10.255.255.255
]
```

---

**Última atualização:** 25/12/2024
