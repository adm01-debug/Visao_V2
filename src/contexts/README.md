# 🌐 Contextos React do VISÃO

## Estrutura

```
contexts/
├── index.tsx         # Export central
├── __tests__/        # 10 testes
└── *Context.tsx      # 11 contextos
```

## Contextos Disponíveis

### 🔐 Autenticação
- `AuthContext.tsx` - Estado de autenticação
- `UserContext.tsx` - Dados do usuário

### 🎨 UI e Tema
- `ThemeContext.tsx` - Contexto de tema
- `ThemeProvider.tsx` - Provider de tema completo
- `SettingsContext.tsx` - Configurações da aplicação

### 📹 Câmeras
- `CameraContext.tsx` - Estado das câmeras

### 🔔 Alertas e Notificações
- `AlertContext.tsx` - Gerenciamento de alertas
- `NotificationContext.tsx` - Sistema de notificações

### 📊 Analytics
- `AnalyticsContext.tsx` - Tracking e analytics

### ♿ Acessibilidade
- `accessibility.tsx` - Contexto de acessibilidade (15KB)

## Uso

```typescript
import { useAuth, useTheme, useAlerts } from "@/contexts";

const { user, isAuthenticated, login, logout } = useAuth();
const { theme, setTheme, isDark } = useTheme();
const { alerts, addAlert, removeAlert } = useAlerts();
```

## Cobertura de Testes

**10 arquivos de teste** - Todos os contextos testados!

---

*Atualizado em 10/01/2026*

