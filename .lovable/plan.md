

## Documentar páginas standalone sem `mb-mobile-nav` (allowlist)

Hoje a `ALLOWLIST` em `scripts/check-mobile-nav.mjs` enumera 7 páginas isentas, mas a justificativa para cada uma vive apenas como comentário curto (`// standalone — não passam pelo MainLayout`). Vamos formalizar a documentação para que o motivo fique explícito tanto no código quanto na documentação consultável.

### Páginas isentas e razão

| Página | Rota | Motivo |
|---|---|---|
| `AuthPage.tsx` | `/auth` | Tela de login/signup; não autenticada, não passa por `MainLayout`/`Sidebar`/`BottomNavigation`. Layout próprio centralizado (`min-h-screen flex items-center`). |
| `Auth.tsx` | (legado, redirecionado) | Variante histórica da tela de auth, mantida por compatibilidade de rota. Mesmo motivo do `AuthPage`. |
| `AuthCallback.tsx` | `/auth/callback` | Handler OAuth pós-redirect (Google). Renderiza só um spinner durante troca de código por sessão; sem UI navegável, sem BottomNav. |
| `ResetPasswordPage.tsx` | `/reset-password` | Fluxo de recuperação de senha acessado via link de e-mail (sem sessão completa). Layout próprio centralizado, sem `MainLayout`. |
| `NotFound.tsx` | `*` (404) | Página de erro genérica, pode ser exibida fora de contexto autenticado. Layout centrado próprio (`min-h-screen flex items-center`). |
| `Index.tsx` | `/` | Apenas redireciona (`/dashboard` se autenticado, `/auth` se não). Renderiza `<SplashScreen />` em transição — sem conteúdo persistente nem BottomNav. |
| `AcessoNegado.tsx` | `/acesso-negado` | Tela de bloqueio RBAC/IP whitelist. Layout standalone próprio para mensagem de erro de permissão. |

### Mudanças

**1. Atualizar o cabeçalho de `scripts/check-mobile-nav.mjs`** para incluir uma tabela compacta explicando cada entrada da `ALLOWLIST`:

```js
// Páginas isentas (standalone — não passam pelo MainLayout):
//   AuthPage.tsx, Auth.tsx     → telas de login/signup pré-autenticação
//   AuthCallback.tsx           → handler OAuth (apenas spinner)
//   ResetPasswordPage.tsx      → fluxo de recuperação via link de e-mail
//   NotFound.tsx               → 404 genérico (pode aparecer fora de auth)
//   Index.tsx                  → apenas redireciona; renderiza SplashScreen
//   AcessoNegado.tsx           → tela de bloqueio RBAC/IP whitelist
```

**2. Criar nova seção "Camada 0 — Páginas standalone (isentas)" em `docs/LAYOUTS.md` §11**, antes da Camada 1, com a tabela completa acima e a regra:

> Páginas standalone NÃO renderizam `BottomNavigation`. Adicionar `mb-mobile-nav` nelas geraria espaço inferior morto (gap de 64px sem motivo). A `ALLOWLIST` do script garante que essas páginas não falhem o build por ausência da classe.

**3. Adicionar JSDoc curto no topo de cada uma das 7 páginas**, padronizando:

```tsx
/**
 * Standalone page — renders OUTSIDE MainLayout (no BottomNavigation).
 * Listed in scripts/check-mobile-nav.mjs ALLOWLIST.
 * Reason: <motivo específico>
 */
```

**4. Atualizar `mem://standards/mobile-nav-checklist`** para listar a justificativa de cada entrada da allowlist standalone (hoje só nomeia os arquivos sem explicar o porquê).

**5. Atualizar `mem://style/mobile-layout-compatibility`** se contiver referência genérica a "todas as páginas" sem ressalva sobre as standalone.

### Arquivos editados

- ✏️ `scripts/check-mobile-nav.mjs` — comentário expandido sobre a ALLOWLIST
- ✏️ `docs/LAYOUTS.md` §11 — nova subseção "Camada 0 — Páginas standalone"
- ✏️ `src/pages/AuthPage.tsx`, `Auth.tsx`, `AuthCallback.tsx`, `ResetPasswordPage.tsx`, `NotFound.tsx`, `Index.tsx`, `AcessoNegado.tsx` — JSDoc no topo
- ✏️ `.lovable/memory/standards/mobile-nav-checklist.md` — tabela de razões por página
- ✏️ `.lovable/memory/style/mobile-layout-compatibility.md` — ressalva sobre standalone (se aplicável)

### Validação

1. `npm run check:mobile-nav` — deve continuar passando sem mudanças funcionais (só documentação).
2. Inspeção visual: abrir cada uma das 7 páginas e confirmar ausência de `BottomNavigation` (justifica a isenção).

### Riscos

- **Risco:** JSDoc nas páginas pode ser removido em refatorações futuras.
  - **Mitigação:** documentação primária fica em `docs/LAYOUTS.md` e na memória; JSDoc é reforço local, não fonte da verdade.
- **Risco:** alguma das 7 páginas pode estar erroneamente na allowlist (ex.: se um dia ganhar `BottomNavigation`).
  - **Mitigação:** processo manual — sempre que rota mudar para usar `MainLayout`, remover entry da allowlist e a heurística do script captura novos wrappers customizados.

