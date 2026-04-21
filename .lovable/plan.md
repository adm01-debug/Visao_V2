

## Verificação de build: garantir `mb-mobile-nav` em todas as páginas autenticadas

Hoje o `scripts/check-mobile-nav.mjs` valida o **MainLayout** e a **CUSTOM_WRAPPER_ALLOWLIST** (4 páginas com wrapper próprio), mas não inspeciona o conteúdo real renderizado por cada página autenticada para confirmar que o padding inferior está aplicado em runtime. Vamos fortalecer a verificação com checagem **estática + runtime** que falha o build.

### Camada 1 — Análise estática expandida (script atual)

Estender `scripts/check-mobile-nav.mjs` para detectar **novos wrappers customizados não-cadastrados**:

- Heurística: páginas em `src/pages/*.tsx` que contenham `min-h-screen`, `h-screen`, `h-dvh`, ou `<Sidebar` no JSX e **não** estejam em `ALLOWLIST` nem em `CUSTOM_WRAPPER_ALLOWLIST`.
- Para cada match: exigir que `mb-mobile-nav` esteja presente OU que a página seja adicionada explicitamente à `CUSTOM_WRAPPER_ALLOWLIST`.
- Mensagem de erro clara apontando o arquivo + linha do wrapper detectado, com sugestão de correção.

Isso captura o cenário "desenvolvedor cria nova página com `min-h-screen` próprio e esquece a classe" — hoje silenciosamente coberto só pelo fallback CSS.

### Camada 2 — Verificação runtime via Playwright (novo)

Criar `tests/e2e/mobile-nav-padding.spec.ts` que:

1. Faz login como usuário de teste (reusa fixtures existentes em `tests/e2e/`).
2. Define viewport mobile (390×844, iPhone 12).
3. Itera sobre uma lista de rotas autenticadas (lida de `src/config/protected-routes.ts` ou hardcoded com as principais: `/dashboard`, `/cameras`, `/alerts`, `/heatmap`, `/analytics`, `/settings`, `/telegram`, `/users`, `/license-plates`, `/face-recognition`, `/productivity`, `/journey-reports`, `/panic-events`, `/behavior-detection`, `/admin/telemetria`).
4. Para cada rota, executa no browser:
   ```js
   const scroll = document.querySelector('[data-app-scroll]');
   const lastChild = scroll?.lastElementChild;
   const padding = parseFloat(getComputedStyle(lastChild).paddingBottom);
   return padding >= 64; // 4rem mínimo
   ```
5. Falha o teste se `padding < 64px` em qualquer rota, listando todas as rotas problemáticas em uma única mensagem.

### Camada 3 — Integração com CI

Atualizar `.github/workflows/ci.yml`:

- Manter o passo `Mobile Nav Checklist` (script estático — rápido, < 1s).
- Adicionar novo passo `Mobile Nav Runtime Check` que executa **apenas** o spec novo do Playwright (`npx playwright test mobile-nav-padding.spec.ts`), evitando rodar a suíte E2E completa nesse job.
- Posicionar antes do `Build` para falhar cedo.

### Camada 4 — Snapshot de regressão (opcional, ativável)

Adicionar flag `--snapshot` no script estático que gera `scripts/.mobile-nav-snapshot.json` com a lista atual de páginas e seus modos (padrão / customWrapper / standalone). Em CI, comparar com snapshot commitado: novo arquivo em `src/pages/` sem entry no snapshot quebra o build, forçando classificação explícita.

### Arquivos editados/criados

- ✏️ `scripts/check-mobile-nav.mjs` — heurística para detectar wrappers não-cadastrados
- ➕ `tests/e2e/mobile-nav-padding.spec.ts` — verificação runtime
- ✏️ `.github/workflows/ci.yml` — novo passo de runtime check
- ✏️ `package.json` — script `test:mobile-nav-runtime` (npx playwright test mobile-nav-padding)
- ✏️ `docs/LAYOUTS.md` seção 11 — documentar as 4 camadas
- ✏️ `.lovable/memory/standards/mobile-nav-checklist.md` — atualizar para 5 camadas (incluindo runtime)
- ➕ `scripts/.mobile-nav-snapshot.json` (opcional, se camada 4 aprovada)

### Validação pós-implementação

1. `npm run check:mobile-nav` — passa, lista as 4 páginas customizadas + 25 padrão limpas
2. `npx playwright test mobile-nav-padding` — passa, todas as ~15 rotas com padding ≥ 64px
3. Teste de regressão proposital: remover `mb-mobile-nav` de `DashboardV2.tsx` → ambos os passos devem falhar com mensagens claras

### Riscos

- **Risco:** teste runtime depende de credenciais de login no CI.
  - **Mitigação:** reusar fixture `tests/e2e/auth.setup.ts` se existir; senão, ajustar plano para usar usuário de teste seedado via Supabase service role.
- **Risco:** rotas dinâmicas (ex.: `/cameras/:id`) não cobertas pelo seed.
  - **Mitigação:** lista inicial só com rotas estáticas; cobertura dinâmica fica como follow-up.
- **Risco:** Playwright lento no CI (~30-60s para 15 rotas).
  - **Mitigação:** rodar em paralelo (`workers: 4`) e sem screenshots/vídeos para esse spec.

