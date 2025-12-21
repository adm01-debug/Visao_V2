# Changelog

Todas as mudanças notáveis do projeto VISÃO serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/spec/v2.0.0.html).

## [Unreleased]

### Adicionado
- Arquivos de som para alertas (alert.mp3, notification.mp3, warning.mp3, success.mp3)
- Ícones PWA em todos os tamanhos (72x72 até 512x512, maskable, apple-touch-icon)
- Configuração de modelos ML via CDN (face-api.js)
- Testes unitários para hooks principais:
  - useFaceAPI.test.ts
  - useHeatmap.test.ts
  - usePPEDetection.test.ts
  - useVideoStream.test.ts
  - useContinuousAnalysis.test.ts
- Traduções completas de heatmap (pt-BR, en-US, es-ES)
- models_config.ts para configuração flexível CDN/local

### Melhorado
- usePPEDetection agora usa GPT-4 Vision como detector primário
- HeatmapVisualization com suporte completo a i18n
- Documentação de modelos ML em /public/models/README.md

### Segurança
- Removido arquivo .env exposto no repositório
- Atualizado .gitignore para proteger arquivos sensíveis

## [0.9.0] - 2025-12-20

### Adicionado
- Sistema completo de streaming WebRTC com MediaMTX
- Detecção facial com face-api.js
- Sistema de reconhecimento facial em tempo real
- Detecção de EPIs (PPE) com múltiplas zonas
- Mapa de calor de movimentação
- Análise contínua de vídeo com IA
- Sistema de alertas em tempo real
- Gravação de clips automática
- Dashboard v2 com estatísticas em tempo real
- PWA com Service Worker
- Internacionalização (pt-BR, en-US, es-ES)
- Docker Compose para deploy completo
- CI/CD com GitHub Actions
- Documentação de API (docs/API.md)

### Infraestrutura
- Supabase Edge Functions para análise de imagem
- Configuração MediaMTX (RTSP, HLS, WebRTC)
- Redis para cache e pub/sub
- Nginx para proxy reverso

## [0.8.0] - 2025-12-19

### Adicionado
- Estrutura inicial do projeto
- Integração com Supabase
- Autenticação de usuários
- CRUD de câmeras
- Visualização de streams HLS

## [0.7.0] - 2025-12-18

### Adicionado
- Setup inicial do Vite + React + TypeScript
- Configuração de Tailwind CSS
- Componentes UI base (shadcn/ui)
- Roteamento com React Router

---

## Tipos de Mudanças

- **Adicionado** - Novas funcionalidades
- **Alterado** - Mudanças em funcionalidades existentes
- **Obsoleto** - Funcionalidades que serão removidas
- **Removido** - Funcionalidades removidas
- **Corrigido** - Correções de bugs
- **Segurança** - Correções de vulnerabilidades
