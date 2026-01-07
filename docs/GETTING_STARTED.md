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

1. Criar projeto em [supabase.com](https://supabase.com)
2. Copiar URL e Anon Key
3. Atualizar `.env`:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

---

## 4. Executar Migrations

```bash
npx supabase link --project-ref xxx
npx supabase db push
```

---

## 5. Iniciar Desenvolvimento

```bash
npm run dev
# Acesse http://localhost:5173
```

---

## 6. Primeiro Acesso

1. Criar conta em `/auth`
2. Configurar primeira câmera
3. Testar streaming

---

## 7. Adicionar Câmera

1. Vá em **Câmeras** → **Adicionar**
2. Insira nome e URL RTSP
3. Teste conexão
4. Salvar

---

## 8. Configurar Reconhecimento

1. Vá em **Pessoas** → **Adicionar**
2. Upload de foto
3. Definir grupo (VIP/Blacklist)

---

## 9. Criar Zona

1. Vá em **Zonas** → **Nova Zona**
2. Selecione câmera
3. Desenhe polígono
4. Configure tipo (restrita/contagem)

---

## 10. Próximos Passos

- [ ] Configurar notificações
- [ ] Adicionar mais câmeras
- [ ] Personalizar alertas
- [ ] Explorar analytics

---

## Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build produção |
| `npm run test` | Executar testes |
| `npm run storybook` | Storybook |

---

**Última atualização:** 06/01/2026
