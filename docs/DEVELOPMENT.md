# Guia de Desenvolvimento - VISÃO

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Docker (opcional)

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/adm01-debug/vis-o.git
cd vis-o

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Iniciar servidor de desenvolvimento
npm run dev
```

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes React reutilizáveis
├── contexts/       # Contextos React (Auth, Theme, etc.)
├── hooks/          # Custom hooks
├── lib/            # Utilitários e bibliotecas
├── pages/          # Páginas da aplicação
├── services/       # Serviços de API
├── types/          # Definições TypeScript
└── utils/          # Funções utilitárias
```

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes com cobertura
npm run test:coverage

# Testes E2E
npm run cypress:open
```

## 📚 Storybook

```bash
# Iniciar Storybook
npm run storybook

# Build do Storybook
npm run build-storybook
```

## 🐳 Docker

```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up

# Produção
docker-compose up -d
```

## 🔧 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run test` | Executa testes |
| `npm run lint` | Verifica código com ESLint |
| `npm run format` | Formata código com Prettier |
| `npm run storybook` | Inicia Storybook |

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Padrões de Código

- Use TypeScript strict mode
- Siga o padrão de commits convencionais
- Escreva testes para novas funcionalidades
- Documente componentes no Storybook
