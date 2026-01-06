# 🚀 Getting Started - Projeto VISÃO

## Início Rápido

---

## 1. Pré-requisitos

| Requisito | Versão |
|-----------|--------|
| Node.js | 20+ |
| npm | 10+ |
| Git | 2.40+ |

---

## 2. Instalação

```bash
# Clonar repositório
git clone https://github.com/adm01-debug/vis-o.git
cd vis-o

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
```

---

## 3. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Copie URL e Anon Key
3. Adicione ao `.env`:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Executar Migrations

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link projeto
supabase link --project-ref YOUR_PROJECT_REF

# Aplicar migrations
supabase db push
```

---

## 5. Iniciar Desenvolvimento

```bash
npm run dev
# Abre em http://localhost:5173
```

---

## 6. Primeiro Acesso

1. Acesse `http://localhost:5173`
2. Crie uma conta
3. Adicione sua primeira câmera
4. Configure zonas de monitoramento
5. Ative notificações

---

## 7. Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build produção |
| `npm run test` | Executar testes |
| `npm run lint` | Verificar código |
| `npm run storybook` | Documentação |

---

## 8. Estrutura do Projeto

```
src/
├── components/    # Componentes React
├── hooks/         # Hooks customizados
├── pages/         # Páginas da aplicação
├── services/      # Serviços e APIs
├── stores/        # Estado global (Zustand)
└── types/         # Tipagens TypeScript
```

---

## 9. Próximos Passos

- [ ] Configurar câmeras RTSP
- [ ] Cadastrar pessoas para reconhecimento
- [ ] Criar zonas de monitoramento
- [ ] Configurar alertas
- [ ] Integrar Telegram/Email

---

## 10. Suporte

- 📖 [Documentação](./README.md)
- 🐛 [Issues](https://github.com/adm01-debug/vis-o/issues)
- 💬 [Discussões](https://github.com/adm01-debug/vis-o/discussions)

---

**Última atualização:** 06/01/2026
