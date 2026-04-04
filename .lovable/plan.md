
# 🚀 Plano de Melhorias Avançadas — Beyond 10/10

## Estado Atual
- **883 arquivos fonte** / ~102K linhas de código
- **1.569 testes** (100% passando)
- **0 erros TypeScript** (strict mode)
- **35/43 rotas** com lazy loading
- **19 tabelas** com RLS completo

---

## Sprint 1: Refatorar God Pages (6 páginas > 400 linhas)

As páginas abaixo ultrapassam 400 linhas e devem ser decompostas em subcomponentes:

| Página | Linhas | Alvo |
|--------|--------|------|
| NotificationSettingsPage | 661 | ~200 |
| RecognitionLogsPage | 598 | ~200 |
| LicensePlatePage | 572 | ~200 |
| PPEPage | 542 | ~200 |
| JourneyReportsPage | 526 | ~200 |
| BehaviorDetectionPage | 476 | ~200 |

**Padrão:** Extrair formulários, tabelas, filtros e cards para `src/components/<domínio>/`.

---

## Sprint 2: Performance & Bundle

1. **Lazy load das 8 rotas restantes** que não usam `React.lazy`
2. **Virtualização de listas longas** — aplicar `react-virtuoso` em tabelas com 100+ itens (alertas, logs, detecções de placas)
3. **Prefetch inteligente** — usar `<link rel="prefetch">` para rotas adjacentes no menu
4. **Image optimization** — lazy loading de thumbnails com `loading="lazy"` e placeholders blur
5. **Bundle analysis** — remover dependências pesadas não utilizadas (tensorflow, face-api.js se não estiver em uso real)

---

## Sprint 3: UX & Acessibilidade Avançada

1. **Skeleton loading** — substituir spinners por skeletons em todas as páginas de dados
2. **Atalhos de teclado globais** — `Ctrl+K` busca, `Ctrl+/` ajuda, `Escape` fechar modais
3. **Dark/Light mode toggle** — já mencionado como prioridade do usuário
4. **Onboarding tour guiado** — primeira visita com tour interativo nas funcionalidades principais
5. **Notificações toast com ações** — toasts com botões de ação rápida (marcar como lido, ir para câmera)

---

## Sprint 4: Observabilidade & Resiliência

1. **Error boundaries granulares** — um por seção do layout (sidebar, main, header)
2. **Retry automático com backoff** — nas queries do React Query com feedback visual
3. **Offline indicator** — banner quando a conexão cair com queue de ações pendentes
4. **Métricas de Web Vitals** — reportar LCP, FID, CLS para monitoring
5. **Health check endpoint** — edge function que verifica status do banco e storage

---

## Sprint 5: Funcionalidades Avançadas

1. **Dashboard customizável** — widgets drag-and-drop com persistência no banco
2. **Exportação avançada** — relatórios PDF/Excel com gráficos embutidos
3. **Webhook notifications** — edge function para disparar webhooks em alertas críticos
4. **API de integração** — edge functions documentadas para integração com sistemas externos
5. **Audit log completo** — registrar todas as ações do usuário com IP e user-agent

---

## Critérios de Conclusão por Sprint
- ✅ 0 erros TypeScript
- ✅ Todos os testes passando
- ✅ Nenhuma página > 400 linhas
- ✅ Build < 30s
- ✅ Lighthouse Performance > 90
