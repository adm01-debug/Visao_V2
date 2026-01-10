# 🖼️ Layouts do VISÃO

## Layouts Disponíveis (5)

### 🔐 AuthLayout
Layout para páginas de autenticação (login, registro, recuperar senha).
- Centralizado
- Sem sidebar
- Fundo com gradiente

### 📊 DashboardLayout
Layout principal para o dashboard e páginas internas.
- Sidebar colapsável
- Header com notificações
- Área de conteúdo responsiva

### 🏠 MainLayout
Layout base que envolve toda a aplicação.
- Providers globais
- Toast container
- Modal container

### ⚠️ ErrorLayout
Layout para páginas de erro (404, 500, acesso negado).
- Minimalista
- Mensagem de erro centralizada
- Link para voltar

### 📝 MinimalLayout
Layout mínimo para páginas especiais.
- Sem sidebar
- Sem header
- Apenas conteúdo

## Uso

```tsx
import { DashboardLayout, AuthLayout } from "@/layouts";

// Em rotas
<Route element={<DashboardLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>

<Route element={<AuthLayout />}>
  <Route path="/login" element={<Login />} />
</Route>
```

---

*Atualizado em 10/01/2026*

