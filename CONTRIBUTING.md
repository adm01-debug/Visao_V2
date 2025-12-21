# 🤝 Guia de Contribuição - VISÃO

Obrigado por considerar contribuir com o projeto VISÃO! Este documento fornece as diretrizes para contribuir de forma eficaz.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Posso Contribuir?](#como-posso-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Padrões de Código](#padrões-de-código)
- [Fluxo de Trabalho](#fluxo-de-trabalho)
- [Commits](#commits)
- [Pull Requests](#pull-requests)

## 📜 Código de Conduta

Esperamos que todos os contribuidores sigam nosso código de conduta:
- Seja respeitoso e inclusivo
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros

## 🎯 Como Posso Contribuir?

### 🐛 Reportando Bugs
1. Verifique se o bug já foi reportado
2. Use o template de issue para bugs
3. Inclua passos para reproduzir
4. Adicione screenshots/logs quando possível

### 💡 Sugerindo Melhorias
1. Crie uma issue com a tag `enhancement`
2. Descreva a melhoria detalhadamente
3. Explique o caso de uso

### 💻 Contribuindo com Código
1. Fork o repositório
2. Crie uma branch para sua feature
3. Desenvolva seguindo os padrões
4. Escreva testes quando aplicável
5. Abra um Pull Request

## 🛠️ Configuração do Ambiente

```bash
# Clone o repositório
git clone https://github.com/adm01-debug/vis-o.git
cd vis-o

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm run dev
```

### Requisitos
- Node.js 18+
- npm 9+
- Conta no Supabase (para backend)

## 📝 Padrões de Código

### TypeScript
- Use tipos explícitos sempre que possível
- Evite `any` - use `unknown` se necessário
- Documente funções complexas com JSDoc

### React
- Use componentes funcionais com hooks
- Extraia lógica complexa para hooks customizados
- Mantenha componentes pequenos e focados

### Estrutura de Arquivos
```
src/
├── components/     # Componentes React reutilizáveis
├── hooks/          # Hooks customizados
├── pages/          # Páginas/rotas da aplicação
├── contexts/       # Contextos React
├── types/          # Definições de tipos TypeScript
├── lib/            # Utilitários e helpers
└── integrations/   # Integrações externas (Supabase, etc)
```

### Nomenclatura
- **Componentes**: PascalCase (`VideoPlayer.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useVideoStream.ts`)
- **Tipos**: PascalCase (`CameraConfig.ts`)
- **Utilitários**: camelCase (`formatDate.ts`)

## 🔄 Fluxo de Trabalho

1. **Sincronize** com a branch principal:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Crie** uma branch para sua feature:
   ```bash
   git checkout -b feature/nome-da-feature
   ```

3. **Desenvolva** suas alterações

4. **Teste** localmente:
   ```bash
   npm run test
   npm run lint
   ```

5. **Commit** suas alterações (veja seção de commits)

6. **Push** para seu fork:
   ```bash
   git push origin feature/nome-da-feature
   ```

7. **Abra** um Pull Request

## 📝 Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não altera código)
- `refactor`: Refatoração
- `test`: Adição/modificação de testes
- `chore`: Manutenção

### Exemplos
```
feat(camera): add multi-stream support
fix(alerts): resolve notification delay
docs(readme): update installation steps
test(hooks): add useVideoStream tests
```

## 🔀 Pull Requests

### Checklist
- [ ] Código segue os padrões do projeto
- [ ] Testes passam localmente
- [ ] Documentação atualizada (se necessário)
- [ ] Commits seguem o padrão convencional
- [ ] Branch está atualizada com `main`

### Template de PR
```markdown
## Descrição
[Descreva as alterações]

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como Testar
[Passos para testar]

## Screenshots (se aplicável)
[Adicione screenshots]
```

## 🧪 Testes

```bash
# Rodar todos os testes
npm run test

# Rodar com coverage
npm run test:coverage

# Rodar em modo watch
npm run test -- --watch
```

## 📚 Recursos Úteis

- [Documentação React](https://react.dev/)
- [Documentação TypeScript](https://www.typescriptlang.org/docs/)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação TensorFlow.js](https://www.tensorflow.org/js)

## ❓ Dúvidas?

Abra uma issue com a tag `question` ou entre em contato com os mantenedores.

---

**Obrigado por contribuir! 🎉**
