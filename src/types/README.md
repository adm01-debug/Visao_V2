# 📝 Tipos TypeScript do VISÃO

## Estrutura

```
types/
├── index.ts           # Export central
├── __tests__/         # Testes de tipos
└── *.ts               # 48 arquivos de tipos
```

## Tipos Principais

### 📹 Câmeras e Vídeo
- `camera.ts` - Tipos de câmeras
- `streaming.ts` - Configurações de stream
- `recording.ts` - Gravações
- `clips.ts` - Clipes de vídeo

### 🔔 Alertas e Eventos
- `alert.ts` - Tipos de alertas
- `events.ts` - Eventos do sistema
- `notification.ts` - Notificações

### 👤 Usuários e Auth
- `auth.ts` - Autenticação
- `user.ts` - Dados de usuário
- `permissions.ts` - Permissões

### 🤖 IA e Detecção
- `faceRecognition.ts` - Reconhecimento facial
- `continuousAnalysis.ts` - Análise contínua
- `zones.ts` - Zonas de detecção

### 🎛️ UI e Estado
- `props.ts` - Props de componentes
- `state.ts` - Estado da aplicação
- `store.ts` - Stores Zustand
- `widgets.ts` - Widgets do dashboard

### 🔧 Infraestrutura
- `api.ts` - Tipos de API
- `http.ts` - Tipos HTTP
- `database.ts` - Esquema do banco
- `supabase.ts` - Tipos Supabase

## Exportação

```typescript
import type { Camera, Alert, User } from "@/types";
```

---

*Atualizado em 10/01/2026*

