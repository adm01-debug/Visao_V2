# 🏗️ Arquitetura - VISÃO

## Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Pages   │ │Components│ │ Hooks   │ │Contexts │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       └──────────┴──────────┴──────────┘                    │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │    Supabase Client    │
              └───────────┬───────────┘
                          │
┌─────────────────────────┼────────────────────────────────────┐
│                    SUPABASE BACKEND                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  Database   │ │ Edge Funcs  │ │  Storage    │            │
│  │ (PostgreSQL)│ │   (Deno)    │ │  (S3-like)  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

## Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Lucide Icons |
| State | TanStack Query, Context API |
| Backend | Supabase (PostgreSQL, Edge Functions) |
| ML | TensorFlow.js, face-api.js |
| Streaming | HLS.js, MediaMTX |

## Estrutura de Diretórios

```
src/
├── components/     # Componentes React reutilizáveis
├── contexts/       # Context providers (auth, i18n, theme)
├── hooks/          # Custom hooks (business logic)
├── pages/          # Páginas/rotas da aplicação
├── types/          # TypeScript interfaces
├── lib/            # Utilitários e helpers
└── integrations/   # Integrações (Supabase)

supabase/
├── functions/      # Edge Functions (Deno)
├── migrations/     # SQL migrations
└── config.toml     # Configuração
```

## Fluxo de Dados

1. **Câmeras** → Streams HLS → Frontend
2. **Detecção** → TensorFlow.js → Alertas
3. **Alertas** → Edge Functions → Notificações
4. **Dados** → Supabase → Realtime updates
