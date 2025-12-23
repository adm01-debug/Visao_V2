# 🔐 Autenticação - VISÃO

## Fluxo de Autenticação
1. Login via Supabase Auth
2. JWT token armazenado
3. Refresh automático

## Providers
- Email/Password
- Google OAuth (opcional)

## Proteção de Rotas
```tsx
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

