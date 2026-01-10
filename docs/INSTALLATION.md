# 🛠️ Guia de Instalação

## Pré-requisitos

- Node.js 20+
- npm ou pnpm
- Docker (opcional)
- Supabase CLI

## Instalação Rápida

```bash
# Clonar repositório
git clone https://github.com/adm01-debug/vis-o.git
cd vis-o

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Iniciar desenvolvimento
npm run dev
```

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_OPENAI_API_KEY=sk-...
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

## Supabase Local

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase local
supabase start

# Aplicar migrations
supabase db push
```

## Docker

```bash
# Build
docker build -t visao .

# Run
docker run -p 3000:3000 visao
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build produção |
| `npm run test` | Testes unitários |
| `npm run e2e` | Testes E2E |
| `npm run storybook` | Storybook |
| `npm run lint` | Linting |
| `npm run typecheck` | Type check |

---

*Atualizado em 10/01/2026*

