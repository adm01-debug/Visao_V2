# Coding Style Guide — VISÃO

Este documento cobre o que o linter **não** consegue verificar sozinho. Regras verificáveis por lint estão em `eslint.config.js` / `eslint-rules/`. Regras de commit estão em `commitlint.config.js`.

Em caso de conflito: **este documento vence sobre preferências pessoais**; `mem://` (memórias do projeto) vence sobre este documento.

---

## 1. TypeScript

- `strict: true` sempre. Sem `any`, sem `@ts-ignore` em `src/`. Use `unknown` + type guard.
- Interfaces para props de componentes; `type` para uniões e utilitários.
- Exports nomeados. `export default` apenas para páginas roteadas via `React.lazy`.
- Discriminated unions para máquinas de estado (`{ status: 'idle' } | { status: 'loading' } | ...`).
- Zod na fronteira: toda entrada externa (form, URL, edge function body, resposta de API) valida antes de entrar no domínio tipado.

## 2. React

- **Nunca** use `useEffect` para estado derivado. Variável computada resolve.
- Estado no nível mais baixo possível. Server state (React Query) separado de UI state (useState/Zustand).
- `useMemo`/`useCallback` só quando há prova de custo (referência estável para deps ou cálculo pesado). Não polvilhe.
- Error Boundary em toda página; skeleton/spinner em todo estado assíncrono.
- Refs encaminhadas com `forwardRef` quando o componente aceita `ref` (React 18 + Router v7).
- `key={index}` é **proibido** em listas dinâmicas.

## 3. Componentes

- Máximo **~300 linhas** por arquivo de componente. Excedeu? Extraia sub-componentes ou hooks.
- Um componente = uma responsabilidade visual. Se o nome precisa de "And", quebre.
- Props sempre estendem tipos nativos quando o componente encapsula HTML (`ComponentProps<'button'>`).
- Classes condicionais via `cn()` de `@/lib/utils`. Nunca `className={a + ' ' + b}`.

## 4. Estilo visual (design system)

- **Somente tokens semânticos HSL** definidos em `index.css`: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, etc.
- **Proibido**: `bg-blue-500`, `text-white`, `bg-[#123456]`, cores hardcoded, gradientes com hex inline. Exceções autorizadas em `mem://style/design-system-color-exceptions`.
- Mobile-first: comece em 1 coluna, adicione `md:`/`lg:` depois.
- Dark mode automático via `class` strategy — nunca duplique paletas.
- `mb-mobile-nav` aplicado uma única vez no `<main>` do `MainLayout` — páginas não redeclaram.

## 5. Hooks customizados

- Nome começa com `use`. Um hook = uma responsabilidade.
- Retornar objeto nomeado (`{ data, isLoading, error }`), não tupla, exceto quando imitando API nativa.
- Cleanup obrigatório em subscriptions e timers. Realtime Supabase: nome de canal único por instância **e** por remontagem — `useRef` com contador incremental somado a um sufixo temporal (`Date.now()` puro colide quando duas instâncias montam no mesmo milissegundo). Ver `mem://architecture/supabase-realtime-react-patterns`.
- Hooks que fazem I/O usam React Query com `staleTime` explícito; nunca `fetch` direto em `useEffect`.

## 6. Edge Functions (Deno)

- Skeleton obrigatório: `corsHeaders` + `try/catch` externo + validação Zod da entrada + `Deno.env.get()` para segredos.
- Erros de provider retornam status e body do provider (não `500` genérico). Ver `mem://architecture/edge-functions-hardening-and-health`.
- Rate limit por IP em endpoints públicos.
- Sem lógica de UI, sem strings traduzíveis.
- Logs via `console.log` com objeto estruturado (JSON) — o coletor faz o resto.

## 7. Banco de dados / RLS

- Toda tabela em `public.*`: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`. Nessa ordem, mesma migration.
- Roles sempre em `user_roles` separada. Nunca em `profiles`.
- Funções `SECURITY DEFINER` com `set search_path = public` e `REVOKE EXECUTE FROM public` — apenas grants explícitos.
- Colunas sensíveis nunca em partições sem policy própria.
- Migrations nomeadas por data + tema. Nunca editar migration já aplicada — crie nova.

## 8. Erros e logs

- Logger estruturado (`src/lib/logger.ts`). Nunca `console.log` solto em produção — proteger com `if (import.meta.env.DEV)`.
- Toda promise no topo tem `.catch` ou `try/catch`. Erros reportados via `errorReporter.ts`.
- Mensagens de erro ao usuário: PT-BR, acionáveis, sem stack trace.

## 9. Performance

- Bundle: usar `React.lazy` para páginas e para bibliotecas pesadas (jsPDF, TFJS, HLS, mediapipe).
- Imagens: dimensões explícitas para evitar CLS. Lazy loading fora do viewport inicial.
- Listas > 100 items: virtualização.
- Verificar impacto em `reports/bundle/summary.md` antes de merge que adiciona dep.

## 10. Testes

- Unit obrigatório para `lib/` e `services/`. Cobertura mínima 80% nas pastas críticas.
- E2E Playwright para fluxos de auth, RLS, CRUD principal e mobile nav.
- TDD em bug fix: escreva teste que reproduz o bug **antes** do fix.
- Nunca teste implementação; teste comportamento observável.

## 11. Commits e PRs

Regras derivadas da diretriz de contribuição (ver `CONTRIBUTING.md`):

1. **1 PR por issue.** PR grande vira épico com PRs filhos.
2. **Branch base correta.** `main` para features, `hotfix/*` para produção.
3. **Testes e docs incluídos.** Mudança de comportamento sem teste é rejeitada.
4. **Sem commits "oops".** Squash/rebase local antes de abrir o PR.
5. **Style guide seguido.** Este documento + `eslint`/`prettier` sem warnings.

Mensagem de commit: `<tipo>(<escopo>): <descrição no imperativo>` — validado por commitlint.

## 12. O que **nunca** fazer

- Colocar `service_role` no frontend.
- Criar tabela pública sem RLS + GRANT.
- Armazenar role no `profiles`.
- Usar `bg-blue-500` (ou qualquer cor hardcoded fora das exceções).
- Reescrever `src/integrations/supabase/client.ts` ou `types.ts` (autogerados).
- Adicionar Sidebar manual em página (o layout já provê).
- Introduzir framework alternativo (Next, Vue, Svelte).
