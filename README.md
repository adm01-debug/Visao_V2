# 🎥 VISÃO - Sistema de Vigilância Inteligente

<div align="center">

![VISÃO](https://img.shields.io/badge/VIS%C3%83O-Sistema%20de%20Vigil%C3%A2ncia-blue?style=for-the-badge)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

**Sistema completo de vigilância por vídeo com IA para reconhecimento facial, detecção de objetos e alertas em tempo real.**

</div>

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API e Edge Functions](#-api-e-edge-functions)
- [Contribuição](#-contribuição)

---

## ✨ Funcionalidades

### 📹 Monitoramento de Câmeras
- Grid de visualização (1x1 até 4x4)
- Streaming HLS em tempo real
- Gravação de clips sob demanda
- Mapa de localização das câmeras

### 👤 Reconhecimento Facial
- Detecção com face-api.js
- Cadastro de pessoas
- Blacklist e VIP list
- Alertas automáticos

### 🗺️ Zonas de Monitoramento
- Editor visual de zonas
- Tipos: restrita, contagem, tripwire
- Alertas por permanência
- Contagem de pessoas

### 🦺 Detecção de EPIs
- Capacete, colete, óculos, máscara
- Zonas com EPIs obrigatórios
- Alertas de não conformidade

### 🔔 Sistema de Alertas
- Push notifications
- Email via Resend
- Telegram Bot
- Webhooks customizados
- Sons configuráveis

### 📊 Analytics
- Dashboard com KPIs
- Gráficos de tendências
- Mapa de calor (heatmap)
- Relatórios em PDF
- Exportação CSV/JSON

### 🌍 Internacionalização
- Português (Brasil)
- English (US)
- Español (ES)

### ♿ Acessibilidade
- ARIA compliant
- Navegação por teclado
- Alto contraste
- Screen reader friendly

---

## 🛠️ Tecnologias

### Frontend
| Tecnologia | Descrição |
|------------|-----------|
| React 18 | Framework UI |
| TypeScript | Tipagem estática |
| Vite | Build tool |
| TailwindCSS | Estilização |
| shadcn/ui | Componentes |
| React Query | Cache/Fetching |
| Recharts | Gráficos |
| hls.js | Streaming HLS |

### Backend (Supabase)
| Tecnologia | Descrição |
|------------|-----------|
| PostgreSQL | Banco de dados |
| Edge Functions | Serverless (Deno) |
| Realtime | WebSockets |
| Storage | Arquivos/Imagens |
| Auth | Autenticação |

### IA/ML
| Tecnologia | Descrição |
|------------|-----------|
| TensorFlow.js | ML no browser |
| COCO-SSD | Detecção de objetos |
| MoveNet | Detecção de poses |
| face-api.js | Reconhecimento facial |
| OpenAI GPT-4V | Análise de imagem |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ React   │  │ Hooks   │  │ Context │  │ Pages   │        │
│  │ + Vite  │  │ Custom  │  │ Global  │  │ Routes  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       └────────────┴────────────┴────────────┘              │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                        SUPABASE                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │PostgreSQL│  │ Edge    │  │Realtime │  │ Storage │        │
│  │ + RLS   │  │Functions│  │WebSocket│  │ Buckets │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      STREAMING                               │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐         │
│  │ Câmeras │ ────▶  │MediaMTX │ ────▶  │  HLS.js │         │
│  │  RTSP   │        │ Server  │        │ Player  │         │
│  └─────────┘        └─────────┘        └─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ ou Bun
- Conta no Supabase
- Git

### Passos

```bash
# 1. Clonar repositório
git clone https://github.com/adm01-debug/vis-o.git
cd vis-o

# 2. Instalar dependências
npm install
# ou
bun install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 4. Rodar em desenvolvimento
npm run dev
# ou
bun dev

# 5. Build para produção
npm run build
```

---

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# Supabase (obrigatório)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-anon-key

# OpenAI (para análise de imagem)
OPENAI_API_KEY=sk-...

# Telegram (para notificações)
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_CHAT_ID=-100...

# Resend (para emails)
RESEND_API_KEY=re_...

# MediaMTX (streaming)
VITE_MEDIAMTX_URL=http://localhost:8888
```

### Supabase

1. Criar projeto no [Supabase](https://supabase.com)
2. Executar migrations em `supabase/migrations/`
3. Deploy das Edge Functions em `supabase/functions/`
4. Configurar Storage buckets

### MediaMTX (Streaming)

Para streaming de câmeras RTSP:

```bash
cd docker
docker-compose -f docker-compose.mediamtx.yml up -d
```

Consulte [docs/MEDIAMTX_SETUP.md](docs/MEDIAMTX_SETUP.md) para detalhes.

---

## 📁 Estrutura do Projeto

```
vis-o/
├── src/
│   ├── components/     # Componentes React
│   │   ├── ui/         # shadcn/ui components
│   │   └── ...         # Componentes customizados
│   ├── contexts/       # React Contexts
│   │   ├── i18n.tsx    # Internacionalização
│   │   ├── accessibility.tsx
│   │   └── ...
│   ├── hooks/          # Custom Hooks
│   │   ├── useMLModels.ts
│   │   ├── useFaceAPI.ts
│   │   ├── usePPEDetection.ts
│   │   └── ...
│   ├── pages/          # Páginas/Rotas
│   ├── types/          # Tipos TypeScript
│   ├── lib/            # Utilitários
│   └── integrations/   # Integrações externas
├── supabase/
│   ├── functions/      # Edge Functions
│   └── migrations/     # SQL Migrations
├── docker/             # Docker configs
├── docs/               # Documentação
└── public/             # Assets estáticos
```

---

## 🔌 API e Edge Functions

### Edge Functions Disponíveis

| Função | Endpoint | Descrição |
|--------|----------|-----------|
| analyze-image | `/analyze-image` | Análise de imagem com GPT-4V |
| detect-faces | `/detect-faces` | Detecção de rostos |
| compare-faces | `/compare-faces` | Comparação facial |
| generate-face-encoding | `/generate-face-encoding` | Gerar encoding 128D |
| send-alert-notification | `/send-alert-notification` | Enviar notificações |
| send-telegram | `/send-telegram` | Enviar para Telegram |
| analyze-license-plate | `/analyze-license-plate` | OCR de placas |

### Tabelas do Banco

| Tabela | Descrição |
|--------|-----------|
| cameras | Câmeras cadastradas |
| alerts | Alertas do sistema |
| registered_persons | Pessoas cadastradas |
| recognition_logs | Logs de reconhecimento |
| zones | Zonas de monitoramento |
| video_clips | Gravações de vídeo |
| ppe_zones | Zonas que requerem EPIs |
| ppe_violations | Violações de EPI |

---

## 📚 Documentação

- [Guia de Deploy](docs/DEPLOY_GUIDE.md)
- [Setup MediaMTX](docs/MEDIAMTX_SETUP.md)
- [Inventário Completo](docs/INVENTARIO_COMPLETO.md)
- [Melhorias Pendentes](docs/MELHORIAS_PENDENTES_REAIS.md)

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

**Desenvolvido com ❤️ usando Claude + Lovable**

</div>
