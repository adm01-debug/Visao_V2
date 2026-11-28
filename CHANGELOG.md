# Changelog

## [2026-11-28] - Guardrail de banco para de esconder que nao roda (infra)

### Changed

- **O job `Guardrails de banco (SECURITY DEFINER + RLS)` nunca executou nenhum dos 74 gates de
  `db:check:all`.** O secret `SUPABASE_DB_URL` nao existe no repositorio (`gh secret list` devolve
  10 secrets, nenhum deles), e o job tratava a ausencia com `::warning::` e terminava `success` —
  um check verde que nao media nada. Agora, quando o secret falta, o job escreve no
  `$GITHUB_STEP_SUMMARY` que os gates foram **pulados** e que o check nao e prova de nada, com o
  caminho para ativar. O job continua sem reprovar (reprovar todo PR nao restauraria o gate e
  derrubaria o repositorio inteiro), mas o verde deixa de ser silencioso.

### Fixed

- Comentario no step `test:drift` deixando explicito que ele roda com fixture e **nao** substitui
  o `db:check:drift`, que exige banco.

## [2026-11-28] - Alertas de manutencao e fallback de URL de camera voltam a funcionar (fix)

### Fixed

- **`evaluate_maintenance_alerts()` falhava em 100% das execucoes desde 2026-08-02** com
  `column reference "severity" is ambiguous`: a variavel PL/pgSQL `severity` colidia com a coluna
  `maintenance_alert_events.severity` nas 3 clausulas de cooldown. A rotina que avisa sobre
  problema de manutencao era a unica sempre quebrada, e a falta de alerta era lida como "esta tudo
  bem". A variavel passa a se chamar `alert_severity`; nenhuma mudanca de logica, assinatura ou grant.
- **O fallback v1 do `resolve-camera-url` retornava 500 sempre.** Chamava
  `rpc('get_camera_stream_url', { p_camera_id, p_key })`, mas a funcao no banco declara
  `_camera_id`/`_key`; o PostgREST resolve RPC por nome de argumento, entao respondia PGRST202
  ("no matches were found in the schema cache"). Corrigido para `_camera_id`/`_key`.

## [2026-11-28] - Um unico workflow de E2E roda em PR e na main (chore)

### Changed

- **`.github/workflows/e2e.yml` foi removido.** Ele era um segundo E2E que rodava so no `push` para
  `main`, sem shards e sem o seed de admin — foi essa duplicacao que deixou a `main` vermelha sem
  que nenhuma PR acusasse. Agora o `e2e-playwright.yml` roda em `pull_request` e em `push` para
  `main`, com 2 shards e o mesmo `environment: e2e`.
- **O disparo manual fica restrito a `main`**, porque o job roda codigo da branch selecionada com
  `SUPABASE_SERVICE_ROLE_KEY` no ambiente.

### Removed

- **Os passos `report:mobile-nav-diff` saíram do CI.** O script `scripts/build-mobile-nav-diff-report.mjs`
  nao existe no repositorio, entao o artefato nunca era gerado (`if-no-files-found: ignore` escondia
  isso). O script do `package.json` fica para quem for implementar.

## [2026-11-27] - E2E da main recebe o seed de admin, igual ao workflow de PR (fix)

### Fixed

- **O `E2E Tests` da `main` reprovava `people`, `settings`, `users` e `notification-settings`.** O
  workflow roda só em `push` para `main` e não recebia `SUPABASE_SERVICE_ROLE_KEY` nem
  `E2E_ALLOW_ADMIN_ROLE`, então o usuário de teste ficava `viewer` e toda rota com `minRole` caía em
  `/acesso-negado` — o `main h1` da página real nunca existia. Passa a usar o mesmo seed do
  `e2e-playwright.yml`, que roda no `pull_request` e por isso escondia a divergência até o merge.

### Security

- **A credencial que ignora RLS ficou restrita à `main`.** O disparo manual agora tem guard
  `github.ref == 'refs/heads/main'`, porque o job executa código da branch selecionada com
  `SUPABASE_SERVICE_ROLE_KEY` no ambiente.
- **Build e testes passam a usar o mesmo projeto Supabase.** Os secrets de URL e chave pública são
  exportados antes do `npm run build`; antes só o Playwright os recebia, e um host diferente do bundle
  fazia o navegador ignorar a sessão criada pelo setup.

## [2026-11-27] - Gate de drift de schema e funcoes do MCP restauradas (feat)

### Added

- **`db:check:drift`**: compara o historico de migrations com o banco e reprova quando uma funcao
  `SECURITY DEFINER` perdeu `prosecdef` ou ficou sem `search_path` fixo. Entra no `db:check:all`.
  O baseline (`scripts/definer-esperados.json`, 233 funcoes) e gerado do ultimo `CREATE`/`DROP` de cada
  funcao no historico, entao respeita quem virou `SECURITY INVOKER` de proposito depois.

### Fixed

- **As funcoes `exec_sql` do MCP nao existiam em producao.** `mcp_exec` e `mcp_exec_many` estao
  declaradas em `20260901113134`, mas `select 1` respondia 503 e toda escrita via MCP falhava. Recriadas
  em producao e numa migration, para que um `db reset` reproduza o estado real.

O gate encontrou o caso que o motivou so de olhar: nenhuma funcao com `SECURITY DEFINER` sem
`search_path` e nenhum definer perdido alem dos que foram corrigidos.

## [2026-11-28] - Restart de stream nao estoura no attempt alto e mantem a funcao fechada (fix)

### Fixed

- **`evaluate_and_restart_streams` derrubava o job quando uma camera acumulava 31 restarts.** A espera era
  `POWER(2, v_last_attempt)::INTEGER`; em PostgreSQL `POWER(2, 31)::INTEGER` levanta `integer out of range`
  e o ciclo inteiro abortava, deixando de processar as outras cameras. Medido em produção: `POWER(2, 31)`
  estoura e a formula nova devolve `60`; havia 48 eventos com `attempt >= 10` em 24 h. Agora o expoente é
  limitado a 6 e a espera é `LEAST(60, GREATEST(1, POWER(2, LEAST(v_last_attempt, 6))::INTEGER))`.
- **A função voltou a ser `SECURITY DEFINER` e a ACL voltou a ser fechada.** O `CREATE OR REPLACE` desta
  migration recriava a definição sem `SECURITY DEFINER` e sem o `REVOKE` de
  `20260721224954:61,117`; em produção a função ficou com `prosecdef = false` e `EXECUTE` para `PUBLIC` e
  `authenticated`. O cron só não parou porque o job roda como `postgres`. A migration agora declara
  `SECURITY DEFINER` e reaplica `REVOKE`/`GRANT` para `service_role`.

## [2026-11-27] - Policies abertas deixam de anular o isolamento entre clientes (fix)

### Security

- **Qualquer conta logada podia editar e apagar dados de outro cliente.** Em `zones`, `zone_events`,
  `site_plans` e `site_plan_placements` havia policies `FOR ALL USING (true) WITH CHECK (true)` para
  `PUBLIC`, herdadas de `00001_consolidated_all_gaps.sql:382-383` e `20251219_zones.sql:49,73`. Como RLS
  combina policies do mesmo comando com **OR**, elas venciam as policies corretas `user_id = auth.uid()`.
  Medido em produção: `cameras` tem 35 linhas de **2 donos distintos**.
- **A leitura era aberta entre clientes** nas tabelas de vigilância (`cameras`, `alerts`,
  `analysis_history`, `panic_events`, `plate_detections`, `recognition_logs`, `registered_persons`,
  `registered_plates`, `zones`, `zone_events`) por policies `allow_select_authenticated_* USING (true)`.
  Todas essas tabelas têm policy de dono própria, então a leitura legítima continua igual.
- **O isolamento por organização das redes de colaboração estava anulado**: `collab_networks`,
  `collab_memberships` e `collab_invitations` tinham policy `SELECT USING (true)` para `PUBLIC` que
  vencia a policy por `collab_user_orgs(auth.uid())`.
- **`ppe_violations` tinha leitura e `UPDATE` abertos para todos.** Passa a ter policy por dono da câmera
  (`cameras.user_id = auth.uid()`); as 12 linhas existentes pertencem a um único dono, então nenhuma tela
  perde registro.
- As policies `allow_select_anon_*` também saem. Hoje `anon` não tem `GRANT` em `public`, então elas são
  inertes — mas um `GRANT` futuro as ativaria e reabriria a leitura anônima de dados de todos os clientes.

`event_alerts` fica de fora: não tem policy baseada em dono, e fechar a leitura sem definir quem vê cada
alerta deixaria a tabela inacessível.

## [2026-11-27] - E2E espera o Auth antes de cobrar o titulo (fix)

### Fixed

- `tests/e2e/auth-routes-mobile-nav.spec.ts`: o `<h1>` das rotas protegidas so aparece depois que o
  `ProtectedLayoutRoute`/`ProtectedRoute` resolvem sessao e permissao (`ProtectedRoute.tsx:27-29`).
  O `gotoAuthenticated` espera o scaffold por 5s (`helpers/authSession.ts:318`) e retorna mesmo se
  ele nao apareceu; o `expect` seguinte dava mais 8s. Com o Auth remoto lento (HTTP 504 em
  `/auth/v1/token`) a soma estourava e o teste reprovava em `/analytics`, `/people`, `/settings` e
  `/users` com `H1 nao encontrado`, sem nenhum erro de produto — o `<h1>` de `/people` renderiza
  incondicionalmente (`PeoplePage.tsx:71`). O `expect` passa a esperar ate 20s; nenhuma assertion foi
  removida nem afrouxada.

## [2026-11-28] - Guardrail do cron tolera banco atrasado no CI (fix)

### Fixed

- **Toda atualização de PR que mexia em banco reprovava no `db-guardrails` depois do merge da #232.** O
  `db:check:cron-jobs` sai 3 quando o banco do CI ainda não tem a migration
  `20261126221000_cron_edge_function_url_helpers.sql`, e essa migration só chega a produção depois do merge.
  O CI passa a rodar `db:check:cron-jobs:ci` (`--tolerar-banco-atrasado`): banco atrasado vira `AVISO` com
  exit 0; reprovação da suíte (exit 1), suíte ausente (exit 2) e `psql` ausente (exit 2) continuam
  bloqueando. O comando manual `db:check:cron-jobs` segue estrito.
- **O precheck passou a exigir os três helpers da migration,** não só o texto do comando: sem a URL do
  projeto configurada a migration para com `WARNING` e não reagenda nada, e antes disso o CI entendia
  como migração aplicada.
- **Suíte ausente agora é erro de checkout, não de banco:** o guardrail sai 2 sem consultar o banco, nos dois
  modos, e a saída passa por `process.exitCode` para o stderr do `psql` não truncar.

## [2026-11-27] - Credencial de retenção sai do texto do job do cron (fix)

### Fixed

- **O segredo da limpeza de retenção ficava em texto claro em `cron.job.command`.** O comando do CSP
  embutia o `retention_secret` para mandar `x-cron-secret`; como `cron.job.command` é legível por qualquer
  administrador do banco, a credencial ficava exposta. Agora o comando cita apenas o nome da função e os
  headers extras (o `x-cron-secret` do CSP e o `x-orchestrator` do tiering) saem de
  `edge_function_cron_extra_headers()`, que lê `internal_cron_secrets` em tempo de execução.
- **O guard `check-cron-jobs-commands.mjs` não estava registrado** em `scripts/automation.config.json`, o
  que reprovava `automation doctor --static` e com ele o job "Contratos da automação local".
- **A checagem do job ONVIF passava com o job ausente** — ela só olhava jobs já existentes. Agora a ausência
  reprova, e o job real (`onvif-event-puller-minutely`) é verificado de fato.

### Added

- `db:check:cron-jobs` e `db:check:camera-schedules` documentados em `scripts/README.md`; `docs/agentes/github-ci.md`
  registra que o guard do cron valida o banco vivo e exige a migration aplicada antes do merge.

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

## [2026-11-27] - Exclusão de conta: dado biométrico, binário no Storage e trilha de auditoria (fix)

### Fixed

- **Configuração biométrica sobrevivia à exclusão.** `face_recognition_configs.user_id` é `NOT NULL` e **não** tem
  FK para `auth.users`; a única cascata vem de `camera_id → cameras ON DELETE CASCADE`. Uma preferência salva sem
  câmera associada (tela de Configurações) ficava órfã depois da conta apagada — dado biométrico residual de um
  titular que pediu exclusão. A migration `20261127140000_delete_user_data_lgpd_storage_e_trilha.sql` passa a
  apagar `face_recognition_configs` por `user_id` dentro de `delete_user_data`.
- **Os arquivos do usuário continuavam no Storage.** Apagar linhas de `storage.objects` por SQL não remove o
  binário; `avatars/{user_id}/avatar.*`, `camera-clips/{user_id}/{camera_id}/*`,
  `camera-snapshots/{user_id}/{camera_id}/*`, `camera-continuous/{user_id}/{camera_id}/*` e
  `site-plans/{user_id}/*` permaneciam acessíveis por URL. `delete-my-account` agora **enumera** os objetos
  (`collectAllUserStorage`), roda a RPC, **remove** o que foi enumerado (`removeUserStoragePaths`) e só então
  chama `auth.admin.deleteUser`. A enumeração tem de vir antes do SQL porque `media_assets`/`site_plans` são
  quem guarda o caminho dos binários — depois do `DELETE` ninguém mais sabe o que apagar. A remoção é
  best-effort: o banco já foi limpo, então abortar ali trocaria "arquivo órfão" por "conta fantasma que não
  sai"; a falha vira log com os caminhos residuais. Falha na enumeração ou na RPC aborta **antes** de destruir
  qualquer coisa, então a conta continua íntegra e o titular pode tentar de novo.
  Bucket `faces` fica fora: os objetos são gravados como `faces/{arquivo}`, sem o dono no caminho, e o heap
  pode conter rosto de terceiros — não há atribuição possível por prefixo.
- **A trilha de auditoria era apagada para destravar o `auth.admin.deleteUser`.** `alertmanager_silences_audit`
  tinha `actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT` e RLS sem `DELETE`: a única
  forma de liberar a FK era um `DELETE` privilegiado, ou seja, o direito ao esquecimento virava bypass de
  auditoria. Agora a FK é `ON DELETE SET NULL`, `delete_user_data` **anonimiza** a linha
  (`actor_user_id`, `actor_email`, `ip_address`, `user_agent`, `comment` e `justification` = `NULL`) e preserva
  ação, matchers, duração, status e horário — a evidência de que o silenciamento ocorreu continua existindo,
  sem nada que identifique a pessoa ou que ela tenha digitado.

### Added

- **Ordem de publicação.** As duas migrations (`20261126233000` e `20261127140000`) precisam estar aplicadas
  **antes** de a Edge Function `delete-my-account` subir: é ela — não a tela — quem chama a RPC
  `delete_user_data`, e a segunda versão da migration é quem a recria. Edge Function nova com banco antigo
  devolve `function does not exist` e aborta antes de apagar qualquer coisa (a chamada à RPC antecede a
  remoção no Storage). O inverso **não** é inofensivo: a Edge antiga chama a mesma RPC `delete_user_data`
  (ela existe desde `20260513172507`) e concluiria a exclusão **sem limpar o Storage**. Por isso o card de
  exclusão de conta só deve ser habilitado junto com a Edge atualizada — regra documentada aqui para que ninguém
  habilite a tela primeiro. Hoje o card é o único chamador de `delete-my-account`, então ninguém usa o caminho
  antigo antes do deploy da Edge nova.
- `supabase/functions/_shared/storagePurge.ts` + `__tests__/storagePurge_test.ts` (13 testes Deno: avatar
  direto, subpastas de clipes, pasta vazia, bucket inexistente, erro real de listagem, erro real de remoção,
  paginação acima de 1000 itens, dois buckets, enumeração sem remoção, remoção exata do enumerado, falha em um
  bucket sem abortar os demais, falha em um lote sem abortar os seguintes e cobertura da lista de buckets).
  A remoção é tolerante a falha parcial: cada bucket e cada lote falham de forma independente e o que não foi
  confirmado volta em `failures` (bucket, caminhos e motivo) para a Edge Function registrar no log — sem isso,
  o primeiro erro deixava os arquivos dos buckets seguintes sem nem uma tentativa, e o titular já tinha perdido
  o acesso para repetir.
- `tests/rls/delete-account-lgpd.sql` + `scripts/check-delete-account-lgpd.mjs` (`npm run db:check:delete-account`,
  encadeado em `db:check:all`): transação com `ROLLBACK` que cria um titular, semeia auditoria privilegiada,
  câmera, configuração biométrica, notificação e trilha de silenciamento **com todos os campos pessoais
  preenchidos**, chama a RPC como `service_role` e confere 8 pontos — incluindo que a trilha comum permanece,
  que a de silenciamento permanece com `actor_user_id`/`actor_email`/`ip_address`/`user_agent`/`comment`/
  `justification` nulos e que o `DELETE FROM auth.users` não é mais bloqueado por FK.
- `scripts/README.md` documenta a família `db:check:*`: o que é guardrail, quais invariantes cobrem e a regra
  de que um guardrail novo precisa entrar em `package.json` **e** na tabela.
- **O guardrail sabe distinguir banco atrasado de regressão.** Ele valida o banco apontado por
  `SUPABASE_DB_URL` (o estado real), não as migrations do repositório. Quando
  `alertmanager_silences_audit.actor_user_id` ainda não é anulável — coluna ausente ou `NOT NULL` — o script
  sai com código 3 e a mensagem "BANCO ATRASADO ... Isto não é regressão de código", em vez de estourar no
  `UPDATE` de anonimização e parecer bug. As migrations da PR precisam estar aplicadas no banco alvo.

## [2026-11-26] - Exclusão de conta: o botão existia, o caminho não (fix)

### Fixed

- **`delete_user_data` abortava antes de apagar qualquer coisa quando chamada pela Edge Function.**
  `delete-my-account` roda com a service role, e nesse contexto `auth.uid()` é `NULL`. A função é
  `SECURITY DEFINER` e usava `auth.uid()` como identidade da auditoria — o `INSERT INTO audit_logs(user_id, ...)`
  violava `audit_logs.user_id NOT NULL` (coluna NOT NULL confirmada no banco) e a transação inteira desfazia.
  Efeito prático: o direito de exclusão nunca funcionou; o titular recebia erro e nada era apagado. A migration
  `20261126233000_delete_user_data_identidade_privilegiada.sql` passa a usar
  `coalesce(auth.uid(), _target_user_id)` e registra `privileged_path` no JSON de auditoria. O guard de
  autorização continua igual para JWT de terceiros (validado: chamada com claim de outro usuário devolve
  "Acesso negado. Você só pode excluir sua própria conta.").
- **A conta ficava meio-excluída por causa de FKs sem `ON DELETE CASCADE`.** `alertmanager_silences_audit.actor_user_id`
  é `ON DELETE RESTRICT` + `NOT NULL`; com uma única linha de auditoria de silenciamento, o
  `auth.admin.deleteUser` falhava com `23503` **depois** de os dados já terem sido apagados (reproduzido em
  conta descartável). A função agora limpa `alertmanager_silences_audit`, `ppe_configs`, `ppe_zones`,
  `ppe_violations` e `test_mode_sessions.created_by` antes do delete da Auth.
- **Dados do titular ficavam para trás fora do caminho de cascade.** `behavior_analyses` guarda análise
  comportamental com `image_url` e tinha 100 linhas reais de um único titular no banco, sem cascatear de
  lugar nenhum e sem estar na lista da função; passou a ser apagada explicitamente. A mesma auditoria
  apontou `camera_bandwidth_hourly`, que é uma **view** sobre `camera_bandwidth_samples` (esta sim
  cascateia por `cameras`) — o `DELETE` nela abortava a transação, descoberto no teste com conta real.

### Changed

- `AccountDeletionCard` sai de `/security` (rota com `minRole="manager"`) e passa a viver em **Meu Perfil**
  (`/profile`), que não tem restrição de papel — `operator` e `viewer` também são titulares de dados e
  precisam conseguir exercer o direito de exclusão.

## [2026-11-26] - Direito de exclusão da conta passa a existir na interface (feat)

### Added

- **`delete-my-account` era uma edge function sem consumidor.** A função apagava a conta em cascata
  (`delete_user_data`) desde a onda de LGPD, mas só era exercível por fora do produto: nenhum botão,
  nenhuma tela. Quem quisesse eliminar a própria conta precisava pedir para alguém com acesso ao banco.
  Agora **Meu Perfil** (`/profile`) traz o card "Excluir minha conta", com diálogo que exige
  digitar `EXCLUIR` para confirmar, aviso explícito do que é apagado (câmeras, gravações, máscaras, alertas
  e histórico, sem recuperação) e encerramento de sessão + redirecionamento para `/auth` quando termina.

### Changed

- `src/components/security/AccountDeletionCard.tsx` (novo) chama o endpoint já deployado
  `supabase.functions.invoke('delete-my-account', { method: 'POST' })`, humaniza o erro do servidor com
  `humanizeFunctionError` e **não** encerra a sessão quando a exclusão falha, para o usuário não ficar
  logado em uma conta meio-apagada.
- Exportado no barrel `src/components/security/index.ts` e montado em `src/pages/ProfilePage.tsx`.
- Cobertura em `src/components/__tests__/AccountDeletionCard.test.tsx`: confirmação exata exigida,
  caminho de sucesso (invoke → signOut → `/auth`) e caminho de falha (erro exibido, sessão preservada).

## [2026-11-27] - Manual de regras de negócio volta para a `main` (chore)

### Added

- **`docs/contexto/regras/manual/` de volta na `main`.** A pasta tinha ficado só na branch gerada `contexto`,
  então quem clonava a `main` não tinha onde escrever regra de negócio e o gerador seguia relatando
  "Nenhuma regra manual em `manual/`". Voltam o `README.md` (como o diretório é lido pelo gerador) e o
  `TEMPLATE-regras-de-negocio.md` (modelo de atores, entidades, estados, prazos e exceções). O texto do
  template agora deixa explícito que só os `.md` reais contam: `README.md` e arquivos `TEMPLATE*` são
  ignorados por `scripts/regras_negocio/generate.py`.

## [2026-11-27] - E2E destravado: canal realtime sem colisão e área rolável focável (fix)

### Fixed

- **Assinaturas realtime se derrubavam entre instâncias do hook.** O canal era nomeado só com `user.id` e
  um sufixo de `Date.now()`: duas instâncias montadas no mesmo milissegundo (StrictMode, troca de câmera,
  página com mais de um consumidor) geravam o mesmo nome e o Supabase Realtime recusava a segunda inscrição —
  a lista de máscaras parava de se atualizar sem erro visível. Agora o nome soma um contador incremental por
  instância, então cada montagem tem canal próprio e o `removeChannel` do cleanup não derruba o vizinho.
- **Região rolável não era alcançável por teclado.** `SwipeableView` renderizava a área de rolagem sem
  `tabIndex`, o que reprova WCAG 2.1.1 (`scrollable-region-focusable`) e impedia navegação por setas em quem
  usa teclado. A prop passou a ser herdada de `React.HTMLAttributes<HTMLDivElement>` e repassada ao `div`.

## [2026-11-26] - Automações agendadas voltam a rodar (fix)

### Fixed

- **Toda a automação agendada estava parada.** Os 14 jobs de `cron.job` que chamam edge functions nasceram
  apontando para a URL e a chave anon de um projeto Supabase que não existe mais. O `pg_cron` marcava cada
  execução como "succeeded" (o disparo HTTP funcionava), enquanto `net._http_response` acumulava
  "Couldn't resolve host name" — nenhuma chamada chegava ao destino. Saúde de stream, watchdog do cron, dispatch
  do centro de monitoramento, tiering de storage, alertas de CSP, monitor de restore e o coletor ONVIF não
  rodavam.

### Changed

- Migration `20261126221000_cron_edge_function_url_helpers.sql`: `public.edge_function_url()` monta a URL da edge
  function a partir de `app.settings.supabase_url` ou de `internal_cron_secrets.supabase_url` — nenhum host
  literal e nenhum segredo versionado. Sem essa configuração a migration avisa e **não** reagenda nada: os jobs
  ficam exatamente como estavam, em vez de serem reescritos para um endereço inexistente.
  `public.edge_function_cron_headers()` monta os cabeçalhos com o `apikey` de
  `internal_cron_secrets.cron_anon_key`; o `x-orchestrator` continua exclusivo do tiering e o job do CSP passa a
  levar `x-cron-secret` (`internal_cron_secrets.retention_secret`) quando cadastrado. Os 14 jobs são reagendados
  preservando nome e expressão cron, e o coletor ONVIF passa a enviar o `apikey` junto do `x-internal-secret`,
  sem `extensions` no `search_path`. O rollback está documentado na própria migration, em três passos.

### Added

- `tests/rls/cron-jobs-commands.sql` (16 checagens) e `scripts/check-cron-jobs-commands.mjs` (`npm run
db:check:cron-jobs`, encadeado no `db:check:all`): provam que os 14 jobs montam URL e cabeçalhos pelos
  helpers, sem URL nem chave literal, com `x-orchestrator` restrito ao tiering, `x-cron-secret` no CSP e o
  coletor ONVIF executável só por `service_role`.

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

## [2026-11-27] - E2E espera o conteudo estabilizar antes de medir overlap (fix)

### Fixed

- **`/analytics @ scroll=bottom` reprovava por medicao instavel.** O spec `mobile-nav-scroll-positions`
  desistia depois de 3 rodadas de convergencia; a pagina monta KPIs e graficos em blocos e reflui a grade
  mais vezes que isso, entao o teste media com ~800px de conteudo ainda abaixo (scrollTop 1614 de 2401) e
  acusava overlap de conteudo em fluxo que o usuario revela rolando. Agora sao ate 10 rodadas exigindo
  `scrollTop` **e** `scrollHeight` estaveis em duas leituras seguidas, e quando nao converge o teste falha
  dizendo que a medicao seria instavel, em vez de reportar uma sobreposicao que nao existe.
