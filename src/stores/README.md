# 🗃️ Stores do VISÃO (Zustand)

## Estrutura

```
stores/
├── index.ts          # Export central
├── __tests__/        # 21 testes
└── *Store.ts         # 22 stores
```

## Stores Disponíveis

### 🎯 Core
- `appStore` - Estado global da aplicação
- `authStore` - Autenticação
- `userStore` - Dados do usuário
- `uiStore` - Estado da UI

### 📹 Câmeras e Mídia
- `cameraStore` - Gerenciamento de câmeras
- `mediaStore` - Mídia e gravações
- `playbackStore` - Reprodução de vídeo
- `recordingStore` - Gravações

### 🔔 Alertas
- `alertStore` - Estado de alertas
- `notificationStore` - Notificações

### 🤖 IA
- `aiStore` - Estado de IA

### 📊 Dados
- `analyticsStore` - Analytics
- `filterStore` - Filtros
- `searchStore` - Busca
- `reportStore` - Relatórios

### 🔧 Sistema
- `settingsStore` - Configurações
- `themeStore` - Tema
- `offlineStore` - Modo offline
- `syncStore` - Sincronização
- `queueStore` - Fila de tarefas
- `integrationStore` - Integrações

## Uso

```typescript
import { useAppStore, useAuthStore } from "@/stores";

const { theme, setTheme } = useAppStore();
const { user, isAuthenticated } = useAuthStore();
```

---

*Atualizado em 10/01/2026*

