

## Teste manual + documentação: rotas autenticadas e menu mobile

Validar manualmente (via browser automation) o comportamento real das rotas autenticadas e do menu mobile após as mudanças recentes (gates de CI, smoke tests, mb-mobile-nav, allowlist standalone), e consolidar os achados em um documento de QA versionado.

### Escopo do teste

**A. Rotas autenticadas (12 rotas-chave)**

| Rota | O que validar |
|---|---|
| `/dashboard` | Layout, BottomNav (mobile), heading H1, sem console errors |
| `/cameras` | Grid, sidebar ativa na categoria Monitoring |
| `/alerts` | Filtros visuais, AlertSeveritySummary |
| `/heatmap` | Wrapper customizado renderiza com `mb-mobile-nav` |
| `/analytics` | Recharts carregam sem layout shift |
| `/recordings` | Lista renderiza, BottomNav não cobre último item |
| `/people` | Página standalone com wrapper próprio |
| `/license-plate` | ALPR dashboard, gráficos |
| `/settings` | Tabs de configuração |
| `/users` | Acesso restrito (RBAC admin) |
| `/notification-settings` | Página com wrapper customizado |
| `/zones` | Wrapper customizado, allowlist |

**B. Menu mobile (viewport iPhone 12 — 390×844)**

1. Hamburger menu visível no canto superior esquerdo
2. Sidebar desktop **escondida** (md:hidden funcionando)
3. Sheet drawer abre ao tocar no hamburger
4. Categorias expandem/colapsam corretamente
5. Navegação fecha o drawer automaticamente
6. BottomNavigation visível e funcional em todas as rotas
7. `mb-mobile-nav` aplica padding-bottom (último elemento não fica sob a barra)
8. Atalho Cmd+K abre QuickSearch (mesmo no mobile)

**C. Páginas standalone (sem MainLayout)**

| Rota | Comportamento esperado |
|---|---|
| `/auth` | Sem BottomNav, sem Sidebar, layout centralizado |
| `/acesso-negado` | Mensagem RBAC, sem chrome de app |
| `/reset-password` | Form de recuperação, layout standalone |
| `*` (404) | NotFound centralizado |

### Procedimento de execução

1. **Setup**: `navigate_to_sandbox` em `/dashboard` (desktop 1280×720). Se redirecionar para `/auth`, pedir login ao usuário antes de prosseguir.
2. **Sweep desktop**: navegar pelas 12 rotas, capturar screenshot final, coletar `console.error` via `read_console_logs`.
3. **Sweep mobile**: `set_viewport_size` 390×844, repetir as 12 rotas. Em cada uma:
   - `observe` para localizar hamburger
   - `act` para abrir o drawer em pelo menos 3 rotas (Dashboard, Heatmap, Analytics)
   - `screenshot` da faixa inferior para confirmar BottomNav visível sem sobreposição
4. **Standalone**: navegar para `/auth`, `/acesso-negado`, `/reset-password`, `/rota-inexistente` — confirmar ausência de BottomNav/Sidebar.
5. **Console hygiene**: agregar todos os `console.error` capturados, filtrar ruído conhecido (Vite HMR, badge), reportar quaisquer erros legítimos.

### Documentação gerada

**Novo arquivo: `docs/QA-MANUAL-RESPONSIVIDADE.md`**

Estrutura:
1. **Resumo executivo** — data do teste, build/commit testado, viewport configs, veredito (PASS/FAIL por categoria).
2. **Matriz de rotas autenticadas** — tabela com colunas: Rota | Desktop ✓ | Mobile ✓ | BottomNav OK | Console limpo | Notas.
3. **Comportamento do menu mobile** — checklist com 8 itens da seção B, com screenshot ilustrativo de Dashboard + drawer aberto + faixa inferior.
4. **Páginas standalone** — confirmação de que as 4 rotas isentas não renderizam BottomNav (referência cruzada para `docs/LAYOUTS.md` §11 Camada 0).
5. **Issues encontradas** — qualquer console error, sobreposição de layout, ou comportamento inesperado, com reprodução passo-a-passo. Se zero issues, registrar explicitamente "Nenhuma regressão detectada".
6. **Cobertura automatizada equivalente** — apontar quais testes E2E (`smoke-pages.spec.ts`, `mobile-nav-overlap.spec.ts`, `mobile-nav-padding.spec.ts`) cobrem cada categoria validada manualmente, para evitar duplicação de esforço futuro.
7. **Procedimento para re-executar** — passos resumidos para QA reproduzir o teste.

**Atualizar `docs/LAYOUTS.md`** — adicionar referência cruzada na seção 11 apontando para o novo doc de QA.

**Atualizar memória `mem://testing/e2e-infrastructure`** — registrar que o doc de QA manual existe e qual escopo cobre, evitando que futuros loops re-testem manualmente o que já está coberto por E2E.

### Critérios de aprovação

- ✅ 12/12 rotas autenticadas carregam sem `console.error`
- ✅ BottomNav presente em todas as rotas mobile autenticadas
- ✅ Nenhum elemento do conteúdo é coberto pela BottomNav (validação visual)
- ✅ Drawer mobile abre/fecha corretamente em 3 rotas testadas
- ✅ 4/4 páginas standalone renderizam **sem** BottomNav
- ✅ Documento `docs/QA-MANUAL-RESPONSIVIDADE.md` versionado

Falha em qualquer critério vira issue documentada na seção 5 + correção proposta antes de fechar o loop.

### Arquivos editados/criados

- ➕ `docs/QA-MANUAL-RESPONSIVIDADE.md` — relatório completo do teste
- ✏️ `docs/LAYOUTS.md` — referência cruzada para o novo doc
- ✏️ `mem://testing/e2e-infrastructure` — anotar cobertura do QA manual

### Riscos

- **Risco:** sessão do preview não autenticada → todas as rotas redirecionam para `/auth`.
  - **Mitigação:** detectar redirect na primeira navegação e pedir ao usuário para fazer login no preview antes de continuar; **não** preencher form de login automaticamente.
- **Risco:** browser automation rate-limited ou indisponível.
  - **Mitigação:** se `navigate_to_sandbox` falhar, reportar ao usuário e continuar gerando o doc com base na análise estática de código (`SidebarMobile.tsx`, `MainLayout.tsx`, `BottomNavigation.tsx`) + cobertura E2E existente, marcando claramente "Validação manual pendente — rodar quando browser disponível".
- **Risco:** QA manual desatualiza rapidamente conforme features novas chegam.
  - **Mitigação:** o doc inclui seção "Cobertura automatizada equivalente" reforçando que os E2E são a fonte da verdade contínua; QA manual é snapshot pontual.

