# 🏗️ Architecture Overview

## Estrutura do Projeto

```
vis-o/
├── src/
│   ├── components/     # Componentes React (414 arquivos)
│   │   └── ui/         # Componentes UI (138 arquivos)
│   ├── hooks/          # Custom Hooks (129 arquivos)
│   ├── services/       # Serviços (35 arquivos)
│   ├── lib/            # Bibliotecas utilitárias (123 arquivos)
│   ├── stores/         # Zustand stores (22 arquivos)
│   ├── contexts/       # React contexts (11 arquivos)
│   ├── providers/      # Context providers (7 arquivos)
│   ├── pages/          # Páginas da aplicação (25 arquivos)
│   ├── types/          # TypeScript types (48 arquivos)
│   ├── integrations/   # Integrações externas (24 arquivos)
│   └── utils/          # Utilitários (39 arquivos)
├── supabase/           # Edge functions e migrations
├── docs/               # Documentação (119 arquivos)
└── tests/              # Testes E2E
```

## Stack Tecnológica

| Categoria | Tecnologia |
|-----------|------------|
| Frontend | React 18, TypeScript 5 |
| Styling | Tailwind CSS, shadcn/ui |
| State | Zustand, React Query |
| Backend | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime, WebRTC |
| AI/ML | TensorFlow.js, face-api.js |
| Testing | Vitest, Testing Library |
| Build | Vite |

## Mais Informações

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para detalhes completos.
