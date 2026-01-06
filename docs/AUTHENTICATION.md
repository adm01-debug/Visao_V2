# 🔐 Authentication Guide - Projeto VISÃO

## Visão Geral

Sistema de autenticação baseado em Supabase Auth com suporte a múltiplos métodos.

---

## 1. Métodos de Autenticação

| Método | Descrição |
|--------|-----------|
| Email/Password | Login tradicional |
| Magic Link | Link por email |
| OAuth | Google, GitHub, etc. |
| API Key | Para integrações |

---

## 2. Fluxo de Login

### Email/Password

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

if (data.session) {
  // Autenticado com sucesso
  const accessToken = data.session.access_token;
}
```

### Magic Link

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://visao.app/auth/callback',
  },
});
```

### OAuth (Google)

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://visao.app/auth/callback',
  },
});
```

---

## 3. Registro de Usuário

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'newuser@example.com',
  password: 'securePassword123',
  options: {
    data: {
      full_name: 'João Silva',
      role: 'operator',
    },
  },
});
```

---

## 4. Logout

```typescript
await supabase.auth.signOut();
```

---

## 5. Session Management

### Obter Sessão Atual

```typescript
const { data: { session } } = await supabase.auth.getSession();
```

### Verificar Usuário

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Refresh Token

```typescript
const { data, error } = await supabase.auth.refreshSession();
```

---

## 6. Auth Context

```tsx
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
};
```

---

## 7. Protected Routes

```tsx
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};
```

---

## 8. Roles e Permissões

### Roles Disponíveis

| Role | Descrição | Permissões |
|------|-----------|------------|
| `admin` | Administrador | Todas |
| `manager` | Gerente | CRUD câmeras, alertas |
| `operator` | Operador | Visualizar, ack alertas |
| `viewer` | Visualizador | Somente leitura |

### Verificar Permissão

```typescript
import { usePermissions } from '@/hooks/usePermissions';

const { can, role } = usePermissions();

if (can('delete', 'cameras')) {
  // Pode deletar câmeras
}
```

---

## 9. Row Level Security (RLS)

### Políticas no Supabase

```sql
-- Usuários só veem suas próprias câmeras
CREATE POLICY "Users see own cameras" ON cameras
  FOR SELECT USING (auth.uid() = user_id);

-- Admins veem tudo
CREATE POLICY "Admins see all" ON cameras
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 10. Password Reset

```typescript
// Solicitar reset
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  { redirectTo: 'https://visao.app/auth/reset-password' }
);

// Atualizar senha
const { error } = await supabase.auth.updateUser({
  password: 'newPassword123',
});
```

---

## 11. Configurações de Segurança

### Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### JWT Settings

| Config | Valor |
|--------|-------|
| JWT Expiry | 3600s (1h) |
| Refresh Token Lifetime | 604800s (7d) |
| Password Min Length | 8 |

---

**Última atualização:** 06/01/2026
