# 🎁 Providers do VISÃO

## Providers Disponíveis (7)

### 🎯 AppProviders
Provider principal que agrupa todos os outros.
- Composição de providers
- Ordem correta de aninhamento

### 📊 AnalyticsProvider
Provider de analytics e tracking.
- Google Analytics
- Mixpanel
- Custom events

### 🔐 SecurityProvider
Provider de segurança.
- CSRF protection
- XSS prevention
- Content Security Policy

### 🔄 QueryProvider
Provider do React Query.
- Cache de dados
- Retry automático
- Stale time

### 🔔 ToastProvider
Provider de notificações toast.
- Toast de sucesso/erro/info
- Posicionamento customizável
- Auto-dismiss

### 📱 ModalProvider
Provider de modais.
- Stack de modais
- Backdrop
- Animações

## Uso

```tsx
// Em App.tsx
import { AppProviders } from "@/providers";

function App() {
  return (
    <AppProviders>
      <Router />
    </AppProviders>
  );
}
```

---

*Atualizado em 10/01/2026*

