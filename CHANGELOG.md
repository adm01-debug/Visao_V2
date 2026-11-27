# Changelog

## [2026-11-26] - Gate do executor separa operacao de CI (fix)

### Fixed

- **`db:check:camera-schedules` volta a ser estrito.** Com a flag `--tolerar-banco-atrasado` embutida, o
  comando manual saía 0 quando o banco estava atrasado — mas sem rodar a suíte SQL, contradizendo o README
  que documenta o exit 3. O comando manual agora usa o modo estrito; o CI usa o novo
  `db:check:camera-schedules:ci` (tolerante), e é esse que o `db:check:all` chama. A tolerância continua
  existindo só onde precisa: a barreira de merge não bloqueia antes da migration chegar ao banco alvo.

- **Sinais de saída confiáveis no `psql` em pipe.** `process.exit()` disparado com o `stderr` em pipe não
  entregava a saída ao processo pai: o guardrail saía com o código certo mas sem a mensagem de erro. O script
  agora só marca `process.exitCode` e faz um único `process.exit()` no fim, com o `stdio` do `psql` capturado
  explicitamente — exit 3 (banco atrasado), 2 (psql ausente), 1 (regressão) e 0 (aprovado) ficam verificáveis.

### Tests

- Matriz de exit codes exercitada com um `psql` falso que distingue o precheck (`-c`) da suíte (`-f`).
  Mutações conferidas: derrubar o exit 3, o exit 1 da suíte ou o exit 0 de sucesso quebra o teste.

## [2026-11-26] - Guardrail do executor de agendamentos endurecido (fix)

### Fixed

- **Senha do banco não vaza mais no log do precheck.** Quando o `psql` falhava antes de rodar a suíte, o
  `catch` relançava o erro cru do driver e a mensagem podia conter a `SUPABASE_DB_URL` inteira — com a senha
  do banco. Agora `mascararUrl()` reduz qualquer `postgres[ql]://usuario:senha@host` a `usuario:***@host` e o
  log mostra só o diagnóstico do `psql`. O script também deixou de executar I/O quando é importado (o
  `precheck` e a suíte só rodam como entrypoint), o que permite testá-lo sem banco.

### Added

- **Cobertura do executor sem JWT e do rearme pela RLS** em `tests/rls/camera-schedules-executor.sql`: um
  bloco roda `execute_camera_schedules()` com `request.jwt.claims = '{}'` (contexto do `pg_cron`) e prova que
  a câmera de outro dono é armada com `user_id` do dono do agendamento e que nenhuma linha grava `user_id`
  nulo; outro bloco refaz o rearme manual com o mesmo upsert de `src/hooks/useArmDisarm.ts` sob
  `authenticated`, provando que a RLS cobre o índice único de `camera_id` e continua barrando gravação em nome
  de terceiro.
- **`scripts/check-camera-schedules-executor.test.mjs`** (4 testes) validado como parte de
  `npm run db:check:camera-schedules`: contrato do mascaramento da URL, presença das asserções do executor sem
  JWT e alinhamento entre o upsert do hook e o `ON CONFLICT (camera_id)` provado na suíte.
- **`--tolerar-banco-atrasado` no gate de CI.** O `db:check:all` roda contra o banco apontado por
  `SUPABASE_DB_URL` e a migration só vai a produção depois do merge, então exit 3 ("banco atrasado") não pode
  bloquear o merge — o script avisa e sai 0. Reprovacão da suíte (exit 1) continua bloqueando.
- **`scripts/README.md`** passa a listar os guardrails de banco (`check-camera-schedules-executor`,
  `check-cron-jobs-commands`, `check-critical-path`), que não estavam no índice.

## [2026-11-27] - Manual de regras de negócio volta para a `main` (chore)

### Added

- **`docs/contexto/regras/manual/` de volta na `main`.** A pasta tinha ficado só na branch gerada `contexto`,
  então quem clonava a `main` não tinha onde escrever regra de negócio e o gerador seguia relatando
  "Nenhuma regra manual em `manual/`". Voltam o `README.md` (como o diretório é lido pelo gerador) e o
  `TEMPLATE-regras-de-negocio.md` (modelo de atores, entidades, estados, prazos e exceções). O texto do
  template agora deixa explícito que só os `.md` reais contam: `README.md` e arquivos `TEMPLATE*` são
  ignorados por `scripts/regras_negocio/generate.py`.

## [2026-11-26] - Editor de máscaras reflete a escrita na hora (fix)

### Fixed

- **Salvar ou remover máscara não aparecia na lista.** `create`, `update`, `toggle` e `remove` de
  `useMotionMasks` só falavam com o banco: a lista de `/motion-masks` e o contador "Máscaras desta câmera" só
  mudavam na leitura seguinte — até `MASK_REFRESH_MS` (15 s) depois, ou ao reabrir a página. Agora a própria
  escrita aplica a mudança na lista já carregada, sem consulta extra.
- `create` só entra na lista quando a máscara é da câmera selecionada (e entra no topo, acompanhando a ordem `created_at` desc); remoção que falha no banco mantém a
  máscara na tela, e `toggle` só muda o item depois da confirmação da escrita.
- `/motion-masks` passa a ter edição da máscara existente (nome, regra e sensibilidade) pelo botão de lápis de cada
  linha. O hook já expunha `update` sem nenhum consumidor: a operação existia e era inalcançável pela interface.
  O desenho do polígono continua sendo feito no editor acima (criar máscara nova).

## [2026-11-26] - Agendamentos de câmera voltam a armar e desarmar (fix)

### Fixed

- **Nenhum agendamento era executado.** `public.execute_camera_schedules()` agregava a coluna `id` de uma função
  `RETURNS SETOF uuid`, cuja coluna de saída se chama como a própria função: cada tick de 1 minuto levantava
  `column "id" does not exist` (42703), gravava `status='error'` em `camera_schedule_runs` e deixava as câmeras
  armadas ou desarmadas fora do horário programado. A agregação passou a usar alias explícito.
- **Um agendamento com fuso inválido derrubava o job inteiro.** O match do cron estava no `WHERE` da consulta,
  fora de qualquer `EXCEPTION`: um `timezone` inexistente abortava a varredura e nenhuma câmera de nenhum usuário
  era tratada naquele minuto. O erro ficou restrito ao agendamento culpado e entra uma única vez por transição,
  em vez de uma linha por minuto no histórico.
- **Desarme perdendo para arme na mesma câmera.** Sem `ORDER BY`, a ordem de execução dependia da varredura
  física da tabela e o arme podia ser gravado depois do desarme, deixando a câmera armada. O laço agora ordena
  por ação (arme antes, desarme depois) e por `created_at, id`, preservando a precedência por câmera definida
  no produto.
- **Desarme manual rejeitado depois de um agendamento.** O executor gravava `armed_by_email = 'schedule:<id>'` e
  o gatilho `validate_armed_by_email` só aceita o e-mail do usuário autenticado — o desarme feito na tela falhava
  com exceção e a câmera continuava armada. Ação automática agora grava `NULL` (a origem fica no histórico de
  execuções) e o arme manual usa `onConflict: 'camera_id'` no upsert, para não bater no índice único
  `uq_arm_disarm_camera` que o próprio executor cria.
- **Formulário aceitava agendamento sem nenhum dia.** Dias vazios viravam cron `*`, indistinguível de "todos os
  dias"; o formulário passou a exigir ao menos um dia e explica o motivo no lugar do CRON.

### Added

- `tests/rls/camera-schedules-executor.sql` e `npm run db:check:camera-schedules`: 20 checagens em Postgres
  descartável provando precedência do desarme, isolamento do erro por agendamento, escopos, ausência de
  histórico quando o cron não casa e o fluxo arme automático → desarme manual.

## [2026-11-26] - Máscaras de movimento passam a redigir o quadro analisado pela IA (fix)

### Fixed

- **`motion_masks` era configuração morta.** A tabela, o editor em `/motion-masks` e a regra include/exclude
  em `public.point_triggers_motion()` existiam desde a onda de PTZ, mas nenhum consumidor aplicava a máscara:
  o quadro capturado pelo player ia inteiro para `analyze-image` e as detecções, a contagem de pessoas e os
  alertas continuavam saindo de dentro da área mascarada. Agora o próprio frame é redigido antes do envio — a
  área mascarada chega preta à IA, sem detecção possível.

### Changed

- Nova camada `src/lib/motionMaskRedaction.ts` monta o plano de máscaras habilitadas e pinta o quadro no canvas
  de captura (`src/components/VideoStreamPlayer.tsx`, `getMaskedFrameForAnalysis`). Câmera **sem** máscara
  habilitada desenha o quadro exatamente como antes; `exclude` prevalece e, havendo `include`, só o interior dele
  é analisado — mesma semântica de `point_triggers_motion`, agora valendo para o caminho que o usuário executa
  (player → `analyze-image`).
- A redação vale **só** para a análise: o buffer de replay (`getFrameForAnalysis`, consumido por
  `AlertReplayPlayer`) continua guardando o quadro original, para a evidência do alerta não perder justamente a
  área mascarada que o operador quer revisar.
- Coordenadas normalizadas (0..1) da máscara viram pixels no canvas, então a redação independe da resolução do
  stream e de qualquer recorte enviado à IA. O canvas é a única autoridade sobre a regra: `point_triggers_motion`
  segue existindo para consultas SQL, mas não participa do caminho de análise.
- `useMotionMasks` relê as máscaras a cada `MASK_REFRESH_MS` (15 s) e ao voltar o foco para a aba: `motion_masks`
  não está na publicação `supabase_realtime`, então o canal `postgres_changes` do hook não entrega nada. A
  releitura de fundo é silenciosa (não troca a tela por "Carregando..." nem repete toast) e, se ela falhar, as
  máscaras já carregadas continuam valendo — zerar a lista faria a IA voltar a analisar a área excluída.
- `src/lib/frameCapture.ts` centraliza a captura do player com o destino explícito (`analysis` = redigido,
  `replay` = original), para que os dois caminhos não possam ser trocados sem aparecer no código.

## [2026-11-26] - Treze telas sem entrada no menu agora são alcançáveis (feat)

### Added

- **O menu expõe telas que só existiam digitando a URL.** A sidebar (`src/components/sidebar/config/categories.ts`)
  e a gaveta mobile (`src/components/navigation/bottomNavData.ts`) passam a listar 13 páginas já roteadas em
  `src/App.tsx` mas sem nenhum link: saúde dos streams, consumo de banda, máscaras de movimento, timelapse,
  agendamentos, alertas de evento, timeline de alertas, avaliação de detecções, agentes locais, parâmetros
  de alerta de stream, operações, uso da API e relatórios CSP. Cada entrada declara o mesmo `minRole` do guard
  da rota, para não oferecer link que o perfil não pode abrir.

- `src/components/navigation/__tests__/navRoutes.test.ts` trava o par menu ↔ `App.tsx`: toda rota do menu
  precisa existir como `<Route>` em `App.tsx`, o `minRole` de uma tela exposta não pode ser mais permissivo
  que o guard da rota e nenhum caminho do menu pode destacar outro item.

### Fixed

- **`isItemActive` da sidebar comparava rotas por prefixo de texto.** Ao abrir `/alerts-timeline`, o item
  "Alertas" (`/alerts`) também ficava destacado. A comparação agora exige fronteira de segmento (`/alerts/...`),
  preservando o destaque de subrotas como `/cameras/frota`.

## [2026-11-25] - Acessibilidade das rotas críticas e correções de interação (fix)

### Fixed

- **Rotas críticas passam no axe** (`tests/e2e/a11y-axe-critical-routes.spec.ts`): as 5 rotas
  auditadas deixam de violar `critical`/`serious` — o shard quebrando por 15 falhas de axe fica verde.
- **Indicadores de página não ficam sob o botão de pânico**: o FAB sobe de `bottom-24` para
  `bottom-32`, fora da área de toque de 44px dos indicadores (`bottom-20`). No celular o último
  atalho abria a confirmação de emergência em vez da rota.
- **Dicas de severidade e de zona voltam a abrir nos cartões de alerta**: os dois gatilhos estavam
  sem `z-index` e eram cobertos pelo botão sobreposto do card (`z-10`), que recebia o ponteiro.
- **Histórico de busca reabre ao clicar no campo**: `Enter` fecha as sugestões sem tirar o foco, e
  `onFocus` não redispara num campo já focado; o clique passa a abrir explicitamente.
- **Elevação da conta de teste a `admin` passa a exigir opt-in** (`E2E_ALLOW_ADMIN_ROLE=1`,
  declarado no workflow com a service key). O hard-skip anterior só recusava URLs contendo "prod"
  e não cobria o projeto de produção real.

## [2026-11-22] - Tooling migrado para o projeto Supabase oficial (fix)

### Changed

- `scripts/inventario/gerar-banco.mjs`, SDK (`src/sdk/visao-api-client.ts`) e spec OpenAPI agora apontam
  para `pmzxbffnbenkmzpnbehb` — o host morto `fsisdfdwlbfeadwfqpir` (Lovable antigo) foi removido de todo
  o tooling (`supabase/config.toml`, `public/openapi.yaml`, `docs/api/openapi.yaml`, blackbox, k6).

- **Requisição explícita obrigatória nos load tests k6**: `tests/load/k6-load-test.js` exige
  `SUPABASE_URL` e `k6-camera-previews.js` exige `BASE_URL` + `ANON_KEY` — nenhum torna a produção
  padrão; sem a variável o k6 aborta. O `DRY_RUN` não é mais aceito dentro do k6
  (simulação só no runner Node `scripts/run-camera-load-test.mjs`).

- `agent/BACKEND_URL` passa a ser o domínio principal (`pmzxbffnbenkmzpnbehb.supabase.co`), porque
  `agent/src/sender.ts` monta a rota `${baseUrl}/functions/v1/...` — o domínio dedicado de functions
  não aceita esse prefixo.

## [2026-11-22] - Face models via CDN correta (fix)

### Changed

- `useFaceAPI` passa a carregar os modelos faciais de `getModelUrl()` (src/config/models_config.ts) em
  vez do hardcode `'/models'`, que retornava 404 (pasta local sem pesos). A URL configurada foi
  corrigida de `npm/face-api.js` (pacote sem `weights/`) para o diretório de pesos do repositório
  fixado em `0.22.2` no jsdelivr (`/gh/justadudewhohacks/face-api.js@0.22.2/weights`), com o mesmo
  manifesto validado por HTTP 200. `index.html` agora libera `https://cdn.jsdelivr.net` em
  `connect-src` (fetch dos manifestos e shards), mantendo `script-src` inalterado.
- Doc alinhado: `public/models/README.md` lista os 3 modelos realmente carregados
  (tinyFaceDetector, faceLandmark68Net, faceRecognitionNet).

## [2026-11-21] - Gravacao de clips no servidor

### Added

- `useClipStorage` agora gravado: salva o clip no bucket privado `camera-clips` com path `{user_id}/{camera_id}/...` e registra em `video_clips` com status `completed`; exclusao individual/em lote remove os arquivos de storage antes de apagar a linha.
- `RecordingsPage`: as 12 URLs da pagina visivel sao re-assinadas via createSignedUrl (chave estavel anti-loop) e o player re-assina o clip ao atravessar paginas; a exclusao em lote age nos clips selecionados mesmo fora da pagina/filtro via `.in('id', ids)`.
- Testes: 14 casos em `clipStorageUrls.test.ts` + 2 de componente em `RecordingsPage.clips.test.tsx`.

## [2026-11-21] - Bitrate adaptativo no player de vídeo

### Added

- `useStreamStats`: adaptação de qualidade por `autoLevelCapping` quando o buffer fica baixo por amostras consecutivas (não fixa nível manual nem descarta buffer); recupera para auto após buffer estável (incluindo teto 0), sem oscilar entre tetos quando `currentLevel` é a variante mínima.

## [2026-11-14] - Estabilização de renderização

### Fixed

- `useFrameBuffer`: snapshot estável por câmera para o `useSyncExternalStore` — elimina o loop de render (React error #185) em /cameras

## [API-1.0.0] - 2026-07-17 — API REST Pública v1 (Ondas 43-52)

### Added

- API REST v1 estável com 13 endpoints (health, status, cameras CRUD read + arm/disarm, events + summary, alerts + acknowledge, panic, signed clip URLs)
- Filtros declarativos com whitelist anti-injeção (`?filter=campo:valor,campo:valor`)
- SDK TypeScript autogerado via `scripts/generate-api-sdk.mjs` (openapi-typescript 7)
- Utilitário HMAC-SHA256 timing-safe para webhooks v2 (`_shared/webhookHmac.ts`)
- Tabela `api_usage_logs` com RLS user-or-admin e retenção 90d (integrada ao cron `visao-daily-retention`)
- Dashboard admin `/admin/api-usage` (top endpoints, p95, error rate, volume/dia)
- Edge function `settings-backup` (export/import de config com whitelist estrita, RPC transacional `import_settings_backup`)
- Página pública `/precos` com JSON-LD Product e 3 tiers (Free/Pro/Enterprise)
- `POSTING_RULES.md` normatizando issues/PRs/branches/deprecação
- Release notes completas em `docs/api/RELEASE_NOTES_v1.0.0.md`

### Security

- IP hasheado (SHA-256 + salt) em telemetria — sem PII
- TTL máx. 7 dias em signed URLs (LGPD + custo storage)
- Rate-limit sensível (20 req/min) em `/v1/panic` e `/v1/trigger-alert`; padrão 60 req/min
- Contrato `/v1/*` congelado — mudanças breaking exigem `/v2/*` com header `Sunset`
- Whitelist estrita de campos filtráveis/ordenáveis (SQL-injection prevention)

## [2026-01-16] - Auditoria de Código

### Fixed

- Removido `console.error` de `AnalyticsComparison.tsx`
- Removido `console.error` de `FaceBlacklistManager.tsx`
- Removido `console.error` de `RealTimeStats.tsx`
- Removido `console.error` de `AuthCallback.tsx`
- Removido `console.warn` de `env.ts`

### Verified

- 0 console statements em produção (exceto DEV mode)
- 0 any types em produção
- 100% documentação presente
- Todos workflows configurados

Todas as mudanças notáveis neste projeto serão documentadas aqui.

## [3.0.0] - 2026-01-12

### Adicionado (V19-V33)

#### Componentes UI (130+)

- **Cards**: Card, StatsCard, DataCard, UserCard, ProductCard, FeatureCard, PricingCard, TestimonialCard
- **Typography**: Heading, Text
- **Forms**: FormField, TextInput, TextArea, PasswordInput, TagsInput, Autocomplete, DateInput, PhoneInput, CPFInput, CurrencyInput, MaskedInput
- **Feedback**: Alert, Toast, Skeleton, LoadingOverlay, EmptyState, ErrorState, EmptyList
- **Navigation**: Tabs, Accordion, Breadcrumb, Pagination, Stepper, TabBar, BottomNav, NavLink
- **Overlays**: Modal, Drawer, Tooltip, Dropdown, ConfirmDialog, CommandMenu
- **Media**: Avatar, AvatarGroup, ImageGallery, FileSize
- **Progress**: ProgressBar, ProgressSteps, Rating, Slider, Countdown
- **Layout**: Grid, SplitView, CenterBox, AspectRatio, PageHeader, Header, Footer, Sidebar, ActionBar
- **Data Display**: Timeline, Divider, LabelValue, Chip, Badge, StatusDot, ColorIndicator, DotIndicator
- **Social**: MessageBubble, Comment, ActivityItem, NotificationItem
- **Utility**: SearchBar, ScrollToTop, CopyButton, KeyboardShortcut, TruncateText, Highlight, CollapseText, PriceTag
- **Vigilância**: CameraCard, AlertEvent, DetectionBox, RecordingBadge, LiveStatus, VideoControls, ZoneMap

#### Hooks (35+)

- useForm, useFetch, useDebounce, useThrottle, useLocalStorage
- useToggle, useDisclosure, useToast, useMediaQuery, useKeyPress
- useWindowSize, useScrollPosition, useEventListener, useInterval
- useTimeout, usePrevious, useOnlineStatus, useAsync, useClipboard
- useCountdown, useHover, useFocus, useClickAway, useLockBodyScroll
- useScript, useTitle, useIntersectionObserver, useMediaDevices

#### Utilitários (45+)

- **Formatting**: formatCurrency, formatPhone, formatDocument, formatFileSize
- **Masks**: maskCPF, maskCNPJ, maskPhone, maskCEP, maskDate, maskCreditCard
- **Strings**: capitalize, truncate, slugify, pluralize
- **Numbers**: clamp, round, percentage, formatNumber
- **Arrays**: unique, groupBy, chunk, sortBy
- **Objects**: pick, omit, deepClone, deepMerge
- **Storage**: localStorage, sessionStorage utilities
- **Browser**: isMobile, isIOS, copyToClipboard
- **Random**: randomInt, randomColor, shuffle

### Estatísticas

- 718 commits
- 1639 arquivos TypeScript
- 1212 arquivos TSX
- 1330 testes

## [2.0.0] - 2026-01-11

### Adicionado

- Limpeza de console.log/error/warn (36 arquivos)
- Correção de any → unknown (3 arquivos)
- Workflows corrigidos (CI, lint, test)
- Documentação inicial

## [1.0.0] - 2026-01-10

### Inicial

- Setup inicial do projeto VIS-O
- Estrutura base de componentes
- Configuração de build e testes
