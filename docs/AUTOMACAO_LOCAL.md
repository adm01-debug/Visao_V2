# Automação local — Visao_V2

O dispatcher `scripts/automation.mjs` liga as suites, o motor de manutenção e o adaptador de grafo. O perfil versionado `scripts/automation.config.json` é a fonte dos aliases e do registro exato de scripts. Apenas ferramentas determinísticas locais: não há chamadas de IA nem cobrança de API de IA. O CI usa minutos do GitHub Actions sujeitos ao plano da conta; execução local usa os recursos da máquina.

## Comandos

| Alias                        | Comando executado                                       | Efeito                                                                                |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `automation:doctor`          | `node scripts/automation.mjs doctor`                    | Verifica arquivos, aliases, registros e instalação local de hooks.                    |
| `automation:test`            | `node scripts/automation.mjs test`                      | Roda exclusivamente as suites registradas abaixo.                                     |
| `automation:check`           | `node scripts/automation.mjs check --ref HEAD`          | Inspeciona a referência HEAD em worktree isolada.                                     |
| `automation:heal`            | `node scripts/automation.mjs heal --ref origin/main`    | Propõe e valida correções limitadas a partir de origin/main; não faz push.            |
| `automation:nightly`         | `node scripts/automation.mjs nightly --ref origin/main` | Atualiza o grafo e tenta manutenção isolada; relata as duas falhas independentemente. |
| `automation:graph`           | `node scripts/automation.mjs graph`                     | Encaminha subcomandos do grafo; acrescente status, query, path ou explain.            |
| `automation:status`          | `node scripts/automation.mjs graph status`              | Mostra a situação local do grafo.                                                     |
| `automation:install-hooks`   | `node scripts/automation.mjs install-hooks`             | Instala pontes locais reversíveis, encadeando hooks originais.                        |
| `automation:uninstall-hooks` | `node scripts/automation.mjs uninstall-hooks`           | Restaura o hooksPath anterior, recusando sobrescrever alteração de terceiros.         |

O comando estático para CI é `node scripts/automation.mjs doctor --static`. Ele verifica contratos; não comprova merge, execução remota, timer ou ponte instalada. `doctor` sem `--static` também exige a instalação local. Ausência de dependência é erro explícito; o dispatcher não instala pacotes automaticamente.

## Gatilhos e ativação

| Gatilho                                                  | Cadeia real de execução                                                                                                                                                  | Ativação                                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR para main / push em main / dispatch                   | `.github/workflows/automation-local.yml` → `doctor --static` → `test` → suites exatas do perfil                                                                          | Workflow versionado; atividade remota depende de publicação/merge e run observado.                                                                                                |
| pre-commit com tooling staged                            | Ponte privada → hook original → `automation.mjs hook pre-commit` → suites registradas                                                                                    | `automation:install-hooks` instala por clone; não é instalado pelo prepare.                                                                                                       |
| pre-push                                                 | Ponte privada → hook original → doctor local → suites registradas                                                                                                        | A mesma instalação local; erro bloqueia a operação.                                                                                                                               |
| Fontes staged / post-commit / post-merge / post-checkout | Ponte privada → hook original → adaptador de grafo marca estado sujo                                                                                                     | Não reconstrói grafo durante commit nem altera staging.                                                                                                                           |
| Noturno local, previsto 04:30                            | Timer do runtime → callback externo `repo-automation-nightly` → `scripts/automation-nightly.sh` → `automation.mjs nightly --ref origin/main` → graph ensure + motor heal | Configuração do timer fica fora do repositório, sob responsabilidade do runtime local. O callback versionado contém o comando real; presença do arquivo não comprova timer ativo. |

A ponte privada fica em `.tools/repo-automation/`; não substitui os arquivos Husky. Preserva erros, argumentos e stdin dos hooks originais, incluindo commit-msg. `prepare`, hooks e guards existentes foram preservados. Para reverter, use `automation:uninstall-hooks`. `nightly.file` aponta para `scripts/automation-nightly.sh`, cuja cadeia é verificada pelo doctor; nenhum arquivo fictício é usado como evidência de agendamento. O runtime deve conferir `systemctl --user status` e a cadeia do callback instalado antes de declarar o timer ativo.

## Suites efetivamente executadas

- `scripts/automation.unit.mjs`
- `scripts/maintenance/maintenance.unit.mjs`
- `scripts/graphify-local.unit.mjs`
- `scripts/autofix-lint/run.test.mjs`

As suites usam fixtures descartáveis e não executam os scripts operacionais do inventário. O motor mantém isolamento de rede, validações obrigatórias, escopo e quotas; um gate herdado vermelho bloqueia o patch. Nenhuma referência, tipo gerado, configuração de produção ou regra de negócio é alterada para forçar verde. O grafo usa o perfil específico `graphify.local.json`; seu estado local fica em `.tools/graphify/local-state/`.

## Registro exato dos demais scripts

Os registros `legacy` abaixo preservam ferramentas anteriores e seus chamadores; não são incluídos automaticamente no novo pipeline. Para arquivos TypeScript de apoio sem runner comprovado, o comando listado só valida o inventário; os chamadores originais continuam sendo a referência de execução. Referência literal indica onde o arquivo é citado, sem garantir que esse caminho rode nem autorização para executar operações contra serviços. Sem referência, o arquivo é mantido manual porque função, parâmetros e ambiente precisam de revisão antes de ativar qualquer gatilho. Scripts novos não cobertos por registro fazem `doctor --static` falhar; não existe registro genérico `scripts/**` para ocultá-los.

| Arquivo exato                                         | Invocação manual de inventário                             | Chamadores literais / justificativa                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `scripts/analyze-bundle.sh`                           | `sh scripts/analyze-bundle.sh`                             | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/audit-deadcode.mjs`                          | `node scripts/audit-deadcode.mjs`                          | package.json:scripts, .github/workflows/knip.yml                                     |
| `scripts/audit-unused-ts.mjs`                         | `node scripts/audit-unused-ts.mjs`                         | package.json:scripts                                                                 |
| `scripts/build-coverage-comment.mjs`                  | `node scripts/build-coverage-comment.mjs`                  | package.json:scripts, .github/workflows/pr-test-suite.yml                            |
| `scripts/build-coverage-report.mjs`                   | `node scripts/build-coverage-report.mjs`                   | package.json:scripts                                                                 |
| `scripts/build-dependency-audit-report.mjs`           | `node scripts/build-dependency-audit-report.mjs`           | package.json:scripts                                                                 |
| `scripts/build-qa-console-report.mjs`                 | `node scripts/build-qa-console-report.mjs`                 | package.json:scripts, .github/workflows/qa-console-full.yml                          |
| `scripts/build-qa-screenshots-report.mjs`             | `node scripts/build-qa-screenshots-report.mjs`             | package.json:scripts                                                                 |
| `scripts/bundle-report.mjs`                           | `node scripts/bundle-report.mjs`                           | package.json:scripts                                                                 |
| `scripts/check-admission-backlog.ts`                  | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-admission-ledger.ts`                   | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-admission-orphan.ts`                   | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-admission-reconcile.ts`                | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-admission-retention.ts`                | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-admission-trend-alert.ts`              | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-admission-trend.ts`                    | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-agent-healing.mjs`                     | `node scripts/check-agent-healing.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-agent-restart-budget.mjs`              | `node scripts/check-agent-restart-budget.mjs`              | package.json:scripts                                                                 |
| `scripts/check-alarm-recurrence-retention.mjs`        | `node scripts/check-alarm-recurrence-retention.mjs`        | package.json:scripts                                                                 |
| `scripts/check-alarm-recurrence.mjs`                  | `node scripts/check-alarm-recurrence.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-alarm-schemes.mjs`                     | `node scripts/check-alarm-schemes.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-armed-now.ts`                          | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-blame-routing.mjs`                     | `node scripts/check-blame-routing.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-bundle-size.mjs`                       | `node scripts/check-bundle-size.mjs`                       | package.json:scripts                                                                 |
| `scripts/check-camera-clock-skew.mjs`                 | `node scripts/check-camera-clock-skew.mjs`                 | package.json:scripts                                                                 |
| `scripts/check-camera-io.mjs`                         | `node scripts/check-camera-io.mjs`                         | package.json:scripts                                                                 |
| `scripts/check-capabilities.mjs`                      | `node scripts/check-capabilities.mjs`                      | package.json:scripts                                                                 |
| `scripts/check-chronic-series.mjs`                    | `node scripts/check-chronic-series.mjs`                    | package.json:scripts                                                                 |
| `scripts/check-collab-entry-lifecycle.mjs`            | `node scripts/check-collab-entry-lifecycle.mjs`            | package.json:scripts                                                                 |
| `scripts/check-collab-governance.mjs`                 | `node scripts/check-collab-governance.mjs`                 | package.json:scripts                                                                 |
| `scripts/check-collab-nav-badge.mjs`                  | `node scripts/check-collab-nav-badge.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-collab-network.mjs`                    | `node scripts/check-collab-network.mjs`                    | package.json:scripts                                                                 |
| `scripts/check-collab-notification-silence.mjs`       | `node scripts/check-collab-notification-silence.mjs`       | package.json:scripts                                                                 |
| `scripts/check-collab-notifications.mjs`              | `node scripts/check-collab-notifications.mjs`              | package.json:scripts                                                                 |
| `scripts/check-collab-retention.mjs`                  | `node scripts/check-collab-retention.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-command-delivery.mjs`                  | `node scripts/check-command-delivery.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-command-sweep.mjs`                     | `node scripts/check-command-sweep.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-coverage-baseline.mjs`                 | `node scripts/check-coverage-baseline.mjs`                 | package.json:scripts                                                                 |
| `scripts/check-critical-path.mjs`                     | `node scripts/check-critical-path.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-csp-allowlist.mjs`                     | `node scripts/check-csp-allowlist.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-dba-privileges.mjs`                    | `node scripts/check-dba-privileges.mjs`                    | package.json:scripts                                                                 |
| `scripts/check-deadcode-baseline.mjs`                 | `node scripts/check-deadcode-baseline.mjs`                 | package.json:scripts, .github/workflows/knip.yml                                     |
| `scripts/check-definer-exposure.mjs`                  | `node scripts/check-definer-exposure.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-device-connect.mjs`                    | `node scripts/check-device-connect.mjs`                    | package.json:scripts                                                                 |
| `scripts/check-device-enrollment.mjs`                 | `node scripts/check-device-enrollment.mjs`                 | package.json:scripts                                                                 |
| `scripts/check-device-silence.mjs`                    | `node scripts/check-device-silence.mjs`                    | package.json:scripts                                                                 |
| `scripts/check-dwell-analytics.mjs`                   | `node scripts/check-dwell-analytics.mjs`                   | package.json:scripts                                                                 |
| `scripts/check-emap.mjs`                              | `node scripts/check-emap.mjs`                              | package.json:scripts                                                                 |
| `scripts/check-env-contract.mjs`                      | `node scripts/check-env-contract.mjs`                      | package.json:scripts                                                                 |
| `scripts/check-episode-bridge-watch.mjs`              | `node scripts/check-episode-bridge-watch.mjs`              | package.json:scripts                                                                 |
| `scripts/check-episode-reconciliation.mjs`            | `node scripts/check-episode-reconciliation.mjs`            | package.json:scripts                                                                 |
| `scripts/check-error-blame.mjs`                       | `node scripts/check-error-blame.mjs`                       | package.json:scripts                                                                 |
| `scripts/check-escalation-decay.ts`                   | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-escalation-profiles.ts`                | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-event-admission.ts`                    | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-evidence-custody.mjs`                  | `node scripts/check-evidence-custody.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-evidence-dossier.mjs`                  | `node scripts/check-evidence-dossier.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-evidence-exports.mjs`                  | `node scripts/check-evidence-exports.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-evidence-seal.mjs`                     | `node scripts/check-evidence-seal.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-favorite-views.mjs`                    | `node scripts/check-favorite-views.mjs`                    | package.json:scripts                                                                 |
| `scripts/check-grant-console.mjs`                     | `node scripts/check-grant-console.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-healing-arbiter.mjs`                   | `node scripts/check-healing-arbiter.mjs`                   | package.json:scripts                                                                 |
| `scripts/check-ingest-endpoints.mjs`                  | `node scripts/check-ingest-endpoints.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-lockfile-parity.mjs`                   | `node scripts/check-lockfile-parity.mjs`                   | package.json:scripts, .github/workflows/ci.yml                                       |
| `scripts/check-maintenance-alerts.mjs`                | `node scripts/check-maintenance-alerts.mjs`                | package.json:scripts                                                                 |
| `scripts/check-maintenance-console.mjs`               | `node scripts/check-maintenance-console.mjs`               | package.json:scripts                                                                 |
| `scripts/check-maintenance-dispatch.mjs`              | `node scripts/check-maintenance-dispatch.mjs`              | package.json:scripts                                                                 |
| `scripts/check-maintenance-escalation.mjs`            | `node scripts/check-maintenance-escalation.mjs`            | package.json:scripts                                                                 |
| `scripts/check-maintenance-sources.mjs`               | `node scripts/check-maintenance-sources.mjs`               | package.json:scripts                                                                 |
| `scripts/check-mediamtx-path-contract.mjs`            | `node scripts/check-mediamtx-path-contract.mjs`            | package.json:scripts                                                                 |
| `scripts/check-mobile-nav.mjs`                        | `node scripts/check-mobile-nav.mjs`                        | package.json:scripts                                                                 |
| `scripts/check-monitoring-centers.mjs`                | `node scripts/check-monitoring-centers.mjs`                | package.json:scripts                                                                 |
| `scripts/check-no-plain-rtsp.mjs`                     | `node scripts/check-no-plain-rtsp.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-onvif-events.mjs`                      | `node scripts/check-onvif-events.mjs`                      | package.json:scripts                                                                 |
| `scripts/check-page-content.mjs`                      | `node scripts/check-page-content.mjs`                      | package.json:scripts                                                                 |
| `scripts/check-partition-backlog-trend.mjs`           | `node scripts/check-partition-backlog-trend.mjs`           | package.json:scripts                                                                 |
| `scripts/check-partition-coverage.mjs`                | `node scripts/check-partition-coverage.mjs`                | package.json:scripts                                                                 |
| `scripts/check-partition-drain.mjs`                   | `node scripts/check-partition-drain.mjs`                   | package.json:scripts                                                                 |
| `scripts/check-partition-quarantine.mjs`              | `node scripts/check-partition-quarantine.mjs`              | package.json:scripts                                                                 |
| `scripts/check-path-evidence.mjs`                     | `node scripts/check-path-evidence.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-path-failover.mjs`                     | `node scripts/check-path-failover.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-reconcile-retention.ts`                | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-relay-lease.mjs`                       | `node scripts/check-relay-lease.mjs`                       | package.json:scripts                                                                 |
| `scripts/check-relay-redelivery.mjs`                  | `node scripts/check-relay-redelivery.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-relay-task-window.mjs`                 | `node scripts/check-relay-task-window.mjs`                 | package.json:scripts                                                                 |
| `scripts/check-relay-verdict.mjs`                     | `node scripts/check-relay-verdict.mjs`                     | package.json:scripts                                                                 |
| `scripts/check-remote-commands.mjs`                   | `node scripts/check-remote-commands.mjs`                   | package.json:scripts                                                                 |
| `scripts/check-retention-alerts.mjs`                  | `node scripts/check-retention-alerts.mjs`                  | package.json:scripts                                                                 |
| `scripts/check-retention-registry.mjs`                | `node scripts/check-retention-registry.mjs`                | package.json:scripts                                                                 |
| `scripts/check-rls-exposure.mjs`                      | `node scripts/check-rls-exposure.mjs`                      | package.json:scripts                                                                 |
| `scripts/check-root-cause-correlation.mjs`            | `node scripts/check-root-cause-correlation.mjs`            | package.json:scripts                                                                 |
| `scripts/check-single-usage.mjs`                      | `node scripts/check-single-usage.mjs`                      | package.json:scripts                                                                 |
| `scripts/check-suppression-retention.ts`              | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/check-tailwind-animations.mjs`               | `node scripts/check-tailwind-animations.mjs`               | package.json:scripts                                                                 |
| `scripts/check-timeline-attestation.mjs`              | `node scripts/check-timeline-attestation.mjs`              | package.json:scripts                                                                 |
| `scripts/check-vault-audit-coverage.mjs`              | `node scripts/check-vault-audit-coverage.mjs`              | package.json:scripts                                                                 |
| `scripts/chunk-size-report.mjs`                       | `node scripts/chunk-size-report.mjs`                       | package.json:scripts                                                                 |
| `scripts/ci/build-playwright-summary.mjs`             | `node scripts/ci/build-playwright-summary.mjs`             | .github/workflows/e2e-playwright.yml                                                 |
| `scripts/ci/check-deploy-freeze.mjs`                  | `node scripts/ci/check-deploy-freeze.mjs`                  | .github/workflows/deploy-freeze-check.yml                                            |
| `scripts/clean.sh`                                    | `sh scripts/clean.sh`                                      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/db-migrate.sh`                               | `sh scripts/db-migrate.sh`                                 | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/deploy.sh`                                   | `sh scripts/deploy.sh`                                     | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/exercise-healing-loop.mjs`                   | `node scripts/exercise-healing-loop.mjs`                   | package.json:scripts                                                                 |
| `scripts/generate-api-sdk.mjs`                        | `node scripts/generate-api-sdk.mjs`                        | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/generate-audit-pdf.mjs`                      | `node scripts/generate-audit-pdf.mjs`                      | package.json:scripts                                                                 |
| `scripts/generate-icons.js`                           | `node scripts/generate-icons.js`                           | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/generate-types.sh`                           | `sh scripts/generate-types.sh`                             | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/generate-version-json.mjs`                   | `node scripts/generate-version-json.mjs`                   | package.json:scripts, .github/workflows/deploy.yml                                   |
| `scripts/health-check.sh`                             | `sh scripts/health-check.sh`                               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/install-all-deps.sh`                         | `sh scripts/install-all-deps.sh`                           | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/install-deps.sh`                             | `sh scripts/install-deps.sh`                               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/lint-migrations.mjs`                         | `node scripts/lint-migrations.mjs`                         | package.json:scripts                                                                 |
| `scripts/pre-commit.sh`                               | `sh scripts/pre-commit.sh`                                 | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/quality-gates.mjs`                           | `node scripts/quality-gates.mjs`                           | package.json:scripts                                                                 |
| `scripts/reset-preview-qa.sh`                         | `sh scripts/reset-preview-qa.sh`                           | package.json:scripts                                                                 |
| `scripts/run-camera-load-test.mjs`                    | `node scripts/run-camera-load-test.mjs`                    | package.json:scripts                                                                 |
| `scripts/seed-e2e-user.mjs`                           | `node scripts/seed-e2e-user.mjs`                           | package.json:scripts                                                                 |
| `scripts/seed-healing-ci-user.mjs`                    | `node scripts/seed-healing-ci-user.mjs`                    | package.json:scripts                                                                 |
| `scripts/seed-rules.mjs`                              | `node scripts/seed-rules.mjs`                              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/seed.sh`                                     | `sh scripts/seed.sh`                                       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/setup.sh`                                    | `sh scripts/setup.sh`                                      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-adversarial-scenarios.mjs`          | `node scripts/simulate-adversarial-scenarios.mjs`          | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-agent-healing.mjs`                  | `node scripts/simulate-agent-healing.mjs`                  | package.json:scripts                                                                 |
| `scripts/simulate-detection-scenarios.mjs`            | `node scripts/simulate-detection-scenarios.mjs`            | package.json:scripts                                                                 |
| `scripts/simulate-env-contract-scenarios.mjs`         | `node scripts/simulate-env-contract-scenarios.mjs`         | package.json:scripts                                                                 |
| `scripts/simulate-finalization-scenarios.mjs`         | `node scripts/simulate-finalization-scenarios.mjs`         | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-insightface-scenarios.mjs`          | `node scripts/simulate-insightface-scenarios.mjs`          | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-mediamtxpath-scenarios.mjs`         | `node scripts/simulate-mediamtxpath-scenarios.mjs`         | package.json:scripts                                                                 |
| `scripts/simulate-wave-53-security-scenarios.mjs`     | `node scripts/simulate-wave-53-security-scenarios.mjs`     | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-54-client-hardening.mjs`       | `node scripts/simulate-wave-54-client-hardening.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-56-fuzz.mjs`                   | `node scripts/simulate-wave-56-fuzz.mjs`                   | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-60-axe.mjs`                    | `node scripts/simulate-wave-60-axe.mjs`                    | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-61-a11y-ci.mjs`                | `node scripts/simulate-wave-61-a11y-ci.mjs`                | .github/workflows/a11y-axe.yml                                                       |
| `scripts/simulate-wave-63-csp-report.mjs`             | `node scripts/simulate-wave-63-csp-report.mjs`             | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-fortress-1-scenarios.mjs`      | `node scripts/simulate-wave-fortress-1-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-fortress-2-scenarios.mjs`      | `node scripts/simulate-wave-fortress-2-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-fortress-3-scenarios.mjs`      | `node scripts/simulate-wave-fortress-3-scenarios.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave-fortress-4-scenarios.mjs`      | `node scripts/simulate-wave-fortress-4-scenarios.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave-fortress-5-scenarios.mjs`      | `node scripts/simulate-wave-fortress-5-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-fortress-6-scenarios.mjs`      | `node scripts/simulate-wave-fortress-6-scenarios.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave-fortress-7-scenarios.mjs`      | `node scripts/simulate-wave-fortress-7-scenarios.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave-shinobi-1-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-1-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-shinobi-2-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-2-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-shinobi-3-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-3-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-shinobi-4-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-4-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-shinobi-5-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-5-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-shinobi-6-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-6-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-shinobi-7-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-7-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-shinobi-8-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-8-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-shinobi-9-scenarios.mjs`       | `node scripts/simulate-wave-shinobi-9-scenarios.mjs`       | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-04-scenarios.mjs`      | `node scripts/simulate-wave-storage-04-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-05-scenarios.mjs`      | `node scripts/simulate-wave-storage-05-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-06-scenarios.mjs`      | `node scripts/simulate-wave-storage-06-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-07-scenarios.mjs`      | `node scripts/simulate-wave-storage-07-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-08-scenarios.mjs`      | `node scripts/simulate-wave-storage-08-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-09-scenarios.mjs`      | `node scripts/simulate-wave-storage-09-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-10-scenarios.mjs`      | `node scripts/simulate-wave-storage-10-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-11-scenarios.mjs`      | `node scripts/simulate-wave-storage-11-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-12-scenarios.mjs`      | `node scripts/simulate-wave-storage-12-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-13-scenarios.mjs`      | `node scripts/simulate-wave-storage-13-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-14-scenarios.mjs`      | `node scripts/simulate-wave-storage-14-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-15-scenarios.mjs`      | `node scripts/simulate-wave-storage-15-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-16-scenarios.mjs`      | `node scripts/simulate-wave-storage-16-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-17-scenarios.mjs`      | `node scripts/simulate-wave-storage-17-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-18-scenarios.mjs`      | `node scripts/simulate-wave-storage-18-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-19-scenarios.mjs`      | `node scripts/simulate-wave-storage-19-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-20-scenarios.mjs`      | `node scripts/simulate-wave-storage-20-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-21-scenarios.mjs`      | `node scripts/simulate-wave-storage-21-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-22-scenarios.mjs`      | `node scripts/simulate-wave-storage-22-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-23-scenarios.mjs`      | `node scripts/simulate-wave-storage-23-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-24-scenarios.mjs`      | `node scripts/simulate-wave-storage-24-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-25-scenarios.mjs`      | `node scripts/simulate-wave-storage-25-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-26-scenarios.mjs`      | `node scripts/simulate-wave-storage-26-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-27-scenarios.mjs`      | `node scripts/simulate-wave-storage-27-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave-storage-28-scenarios.mjs`      | `node scripts/simulate-wave-storage-28-scenarios.mjs`      | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave10-scenarios.mjs`               | `node scripts/simulate-wave10-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave100-scenarios.mjs`              | `node scripts/simulate-wave100-scenarios.mjs`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave101-scenarios.mjs`              | `node scripts/simulate-wave101-scenarios.mjs`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave106-scenarios.mjs`              | `node scripts/simulate-wave106-scenarios.mjs`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave107-scenarios.mjs`              | `node scripts/simulate-wave107-scenarios.mjs`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave108-scenarios.mjs`              | `node scripts/simulate-wave108-scenarios.mjs`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave109-scenarios.mjs`              | `node scripts/simulate-wave109-scenarios.mjs`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave11-scenarios.mjs`               | `node scripts/simulate-wave11-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave110-scenarios.mjs`              | `node scripts/simulate-wave110-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave111-scenarios.mjs`              | `node scripts/simulate-wave111-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave112-scenarios.mjs`              | `node scripts/simulate-wave112-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave113-scenarios.mjs`              | `node scripts/simulate-wave113-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave114-scenarios.mjs`              | `node scripts/simulate-wave114-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave116-scenarios.mjs`              | `node scripts/simulate-wave116-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave117-scenarios.mjs`              | `node scripts/simulate-wave117-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave118-scenarios.mjs`              | `node scripts/simulate-wave118-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave119-scenarios.mjs`              | `node scripts/simulate-wave119-scenarios.mjs`              | package.json:scripts                                                                 |
| `scripts/simulate-wave12-scenarios.mjs`               | `node scripts/simulate-wave12-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave120-scenarios.mjs`              | `node scripts/simulate-wave120-scenarios.mjs`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave123-scenarios.mjs`              | `node scripts/simulate-wave123-scenarios.mjs`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave14-scenarios.mjs`               | `node scripts/simulate-wave14-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave144-network-chaos.mjs`          | `node scripts/simulate-wave144-network-chaos.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave147-blame-routing.mjs`          | `node scripts/simulate-wave147-blame-routing.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave148-owner-filter.mjs`           | `node scripts/simulate-wave148-owner-filter.mjs`           | package.json:scripts                                                                 |
| `scripts/simulate-wave149-owner-aging.mjs`            | `node scripts/simulate-wave149-owner-aging.mjs`            | package.json:scripts                                                                 |
| `scripts/simulate-wave15-scenarios.mjs`               | `node scripts/simulate-wave15-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave150-capabilities.mjs`           | `node scripts/simulate-wave150-capabilities.mjs`           | package.json:scripts                                                                 |
| `scripts/simulate-wave151-grant-console.mjs`          | `node scripts/simulate-wave151-grant-console.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave152-path-failover.mjs`          | `node scripts/simulate-wave152-path-failover.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave153-path-evidence.mjs`          | `node scripts/simulate-wave153-path-evidence.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave158-evidence-seal.mjs`          | `node scripts/simulate-wave158-evidence-seal.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave159-evidence-registry.mjs`      | `node scripts/simulate-wave159-evidence-registry.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave16-scenarios.mjs`               | `node scripts/simulate-wave16-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave160-dossier.mjs`                | `node scripts/simulate-wave160-dossier.mjs`                | package.json:scripts                                                                 |
| `scripts/simulate-wave161-emap.mjs`                   | `node scripts/simulate-wave161-emap.mjs`                   | package.json:scripts                                                                 |
| `scripts/simulate-wave162-emap-realtime.mjs`          | `node scripts/simulate-wave162-emap-realtime.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave163-emap-notices.mjs`           | `node scripts/simulate-wave163-emap-notices.mjs`           | package.json:scripts                                                                 |
| `scripts/simulate-wave164-emap-pulse.mjs`             | `node scripts/simulate-wave164-emap-pulse.mjs`             | package.json:scripts                                                                 |
| `scripts/simulate-wave165-emap-suppressions.mjs`      | `node scripts/simulate-wave165-emap-suppressions.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave166-plan-navigator.mjs`         | `node scripts/simulate-wave166-plan-navigator.mjs`         | package.json:scripts                                                                 |
| `scripts/simulate-wave167-attention-router.mjs`       | `node scripts/simulate-wave167-attention-router.mjs`       | package.json:scripts                                                                 |
| `scripts/simulate-wave168-attention-clock.mjs`        | `node scripts/simulate-wave168-attention-clock.mjs`        | package.json:scripts                                                                 |
| `scripts/simulate-wave169-shift-handoff.mjs`          | `node scripts/simulate-wave169-shift-handoff.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave17-scenarios.mjs`               | `node scripts/simulate-wave17-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave170-shift-durability.mjs`       | `node scripts/simulate-wave170-shift-durability.mjs`       | package.json:scripts                                                                 |
| `scripts/simulate-wave171-triage-queue.mjs`           | `node scripts/simulate-wave171-triage-queue.mjs`           | package.json:scripts                                                                 |
| `scripts/simulate-wave172-triage-ack.mjs`             | `node scripts/simulate-wave172-triage-ack.mjs`             | package.json:scripts                                                                 |
| `scripts/simulate-wave173-ack-handoff.mjs`            | `node scripts/simulate-wave173-ack-handoff.mjs`            | package.json:scripts                                                                 |
| `scripts/simulate-wave174-triage-sla.mjs`             | `node scripts/simulate-wave174-triage-sla.mjs`             | package.json:scripts                                                                 |
| `scripts/simulate-wave175-shift-performance.mjs`      | `node scripts/simulate-wave175-shift-performance.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave176-triage-escalation.mjs`      | `node scripts/simulate-wave176-triage-escalation.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave177-alarm-treatment.mjs`        | `node scripts/simulate-wave177-alarm-treatment.mjs`        | package.json:scripts                                                                 |
| `scripts/simulate-wave178-alarm-aggregation.mjs`      | `node scripts/simulate-wave178-alarm-aggregation.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave179-alarm-recurrence.mjs`       | `node scripts/simulate-wave179-alarm-recurrence.mjs`       | package.json:scripts                                                                 |
| `scripts/simulate-wave18-scenarios.mjs`               | `node scripts/simulate-wave18-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave181-episode-bridge.mjs`         | `node scripts/simulate-wave181-episode-bridge.mjs`         | package.json:scripts                                                                 |
| `scripts/simulate-wave182-episode-queue.mjs`          | `node scripts/simulate-wave182-episode-queue.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave183-chronic-series.mjs`         | `node scripts/simulate-wave183-chronic-series.mjs`         | package.json:scripts                                                                 |
| `scripts/simulate-wave184-recurrence-retention.mjs`   | `node scripts/simulate-wave184-recurrence-retention.mjs`   | package.json:scripts                                                                 |
| `scripts/simulate-wave185-episode-bridge.mjs`         | `node scripts/simulate-wave185-episode-bridge.mjs`         | package.json:scripts                                                                 |
| `scripts/simulate-wave187-episode-reconciliation.mjs` | `node scripts/simulate-wave187-episode-reconciliation.mjs` | package.json:scripts                                                                 |
| `scripts/simulate-wave188-favorite-views.mjs`         | `node scripts/simulate-wave188-favorite-views.mjs`         | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave189-detached-monitor.mjs`       | `node scripts/simulate-wave189-detached-monitor.mjs`       | package.json:scripts                                                                 |
| `scripts/simulate-wave190-device-enrollment.mjs`      | `node scripts/simulate-wave190-device-enrollment.mjs`      | package.json:scripts                                                                 |
| `scripts/simulate-wave191-device-connect.mjs`         | `node scripts/simulate-wave191-device-connect.mjs`         | package.json:scripts                                                                 |
| `scripts/simulate-wave192-device-silence.mjs`         | `node scripts/simulate-wave192-device-silence.mjs`         | package.json:scripts                                                                 |
| `scripts/simulate-wave193-remote-command.mjs`         | `node scripts/simulate-wave193-remote-command.mjs`         | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave194-command-delivery.mjs`       | `node scripts/simulate-wave194-command-delivery.mjs`       | package.json:scripts                                                                 |
| `scripts/simulate-wave195-command-sweep.mjs`          | `node scripts/simulate-wave195-command-sweep.mjs`          | package.json:scripts                                                                 |
| `scripts/simulate-wave196-command-reliability.mjs`    | `node scripts/simulate-wave196-command-reliability.mjs`    | package.json:scripts                                                                 |
| `scripts/simulate-wave197-face-search.mjs`            | `node scripts/simulate-wave197-face-search.mjs`            | package.json:scripts                                                                 |
| `scripts/simulate-wave198-reference-match.mjs`        | `node scripts/simulate-wave198-reference-match.mjs`        | package.json:scripts                                                                 |
| `scripts/simulate-wave199.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave20-scenarios.mjs`               | `node scripts/simulate-wave20-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave200.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave201.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave202.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave203.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave205.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave206.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave207.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave208-video.ts`                   | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave208.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave209.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave21-scenarios.mjs`               | `node scripts/simulate-wave21-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave211.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave212.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave213.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave214.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave215.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave22-scenarios.mjs`               | `node scripts/simulate-wave22-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave220-221.ts`                     | `node scripts/automation.mjs doctor --static`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave223.ts`                         | `node scripts/automation.mjs doctor --static`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave224.ts`                         | `node scripts/automation.mjs doctor --static`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave226.ts`                         | `node scripts/automation.mjs doctor --static`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave227.ts`                         | `node scripts/automation.mjs doctor --static`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave229.ts`                         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave23-scenarios.mjs`               | `node scripts/simulate-wave23-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave230-admission-retention.ts`     | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave231-purge-history.ts`           | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave232-backlog-alert.ts`           | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave233-reconcile.ts`               | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave234-orphan-alert.ts`            | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave235-orphan-trend.ts`            | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave236-trend-alert.ts`             | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave237-snapshot-retention.ts`      | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave238-escalation-profiles.ts`     | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave239-console-profile.ts`         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave24-scenarios.mjs`               | `node scripts/simulate-wave24-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave240-condition-throttle.ts`      | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave241-condition-silence.ts`       | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave242-suppression-ledger.ts`      | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave243-suppression-retention.ts`   | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave244-retention-debut.ts`         | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave245-retention-debut-view.ts`    | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave246-dispatch-deliverability.ts` | `node scripts/automation.mjs doctor --static`              | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave247-deliverability-alert.ts`    | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave248-acknowledgement-decay.ts`   | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave249-escalation-decay.ts`        | `node scripts/automation.mjs doctor --static`              | package.json:scripts                                                                 |
| `scripts/simulate-wave25-scenarios.mjs`               | `node scripts/simulate-wave25-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave26-scenarios.mjs`               | `node scripts/simulate-wave26-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave27-scenarios.mjs`               | `node scripts/simulate-wave27-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave28-scenarios.mjs`               | `node scripts/simulate-wave28-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave29-scenarios.mjs`               | `node scripts/simulate-wave29-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave30-scenarios.mjs`               | `node scripts/simulate-wave30-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave31-scenarios.mjs`               | `node scripts/simulate-wave31-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave32-scenarios.mjs`               | `node scripts/simulate-wave32-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave33-scenarios.mjs`               | `node scripts/simulate-wave33-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave34-scenarios.mjs`               | `node scripts/simulate-wave34-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave35-scenarios.mjs`               | `node scripts/simulate-wave35-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave36-scenarios.mjs`               | `node scripts/simulate-wave36-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave37-scenarios.mjs`               | `node scripts/simulate-wave37-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave38-scenarios.mjs`               | `node scripts/simulate-wave38-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave39-scenarios.mjs`               | `node scripts/simulate-wave39-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave40-scenarios.mjs`               | `node scripts/simulate-wave40-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave41-scenarios.mjs`               | `node scripts/simulate-wave41-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave8-scenarios.mjs`                | `node scripts/simulate-wave8-scenarios.mjs`                | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave89-scenarios.mjs`               | `node scripts/simulate-wave89-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave90-scenarios.mjs`               | `node scripts/simulate-wave90-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave91-scenarios.mjs`               | `node scripts/simulate-wave91-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave92-scenarios.mjs`               | `node scripts/simulate-wave92-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave93-scenarios.mjs`               | `node scripts/simulate-wave93-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave94-scenarios.mjs`               | `node scripts/simulate-wave94-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave95-scenarios.mjs`               | `node scripts/simulate-wave95-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave96-scenarios.mjs`               | `node scripts/simulate-wave96-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave97-scenarios.mjs`               | `node scripts/simulate-wave97-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave98-scenarios.mjs`               | `node scripts/simulate-wave98-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wave99-scenarios.mjs`               | `node scripts/simulate-wave99-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-waves-44-52-scenarios.mjs`          | `node scripts/simulate-waves-44-52-scenarios.mjs`          | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/simulate-wizard-scenarios.mjs`               | `node scripts/simulate-wizard-scenarios.mjs`               | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/validate-skeletons.mjs`                      | `node scripts/validate-skeletons.mjs`                      | package.json:scripts                                                                 |
| `scripts/verify-stack.sh`                             | `sh scripts/verify-stack.sh`                               | package.json:scripts                                                                 |
| `scripts/vitest-flaky-retry.mjs`                      | `node scripts/vitest-flaky-retry.mjs`                      | package.json:scripts, .github/workflows/pr-test-suite.yml                            |
| `scripts/wave-59-aria-label-injector.py`              | `python3 scripts/wave-59-aria-label-injector.py`           | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/wave-59-repair-arrows.py`                    | `python3 scripts/wave-59-repair-arrows.py`                 | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/wave-59-repair.py`                           | `python3 scripts/wave-59-repair.py`                        | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |

## Hooks e workflows anteriores

Hooks inventariados: `.husky/_` era o hooksPath observado. A tabela registra os arquivos, sem afirmar bootstrap instalado ou execução efetiva em outro clone. O registro legacy desses hooks limita apenas execução arbitrária pelo dispatcher; o Git e a ponte preservam os gatilhos originais.

| Hook exato          | Gatilho Git original | Referência de inventário                              |
| ------------------- | -------------------- | ----------------------------------------------------- |
| `.husky/commit-msg` | `commit-msg`         | Hook preservado e encadeado antes do novo dispatcher. |
| `.husky/pre-commit` | `pre-commit`         | Hook preservado e encadeado antes do novo dispatcher. |
| `.husky/pre-push`   | `pre-push`           | Hook preservado e encadeado antes do novo dispatcher. |

Workflows anteriores preservados: 43. Os gatilhos e condições de cada arquivo continuam definidos no YAML original; esta listagem não os promove ao novo pipeline e não executa suas operações.

- `.github/workflows/a11y-axe.yml`
- `.github/workflows/accessibility.yml`
- `.github/workflows/auto-merge.yml`
- `.github/workflows/blue-green.yml`
- `.github/workflows/bundle-size.yml`
- `.github/workflows/canary-deploy.yml`
- `.github/workflows/cd.yml`
- `.github/workflows/chromatic.yml`
- `.github/workflows/ci-failure-alert.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/coverage.yml`
- `.github/workflows/dependency-audit.yml`
- `.github/workflows/dependency-review.yml`
- `.github/workflows/deploy-freeze-check.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/docker-security.yml`
- `.github/workflows/e2e-coverage.yml`
- `.github/workflows/e2e-playwright.yml`
- `.github/workflows/e2e.yml`
- `.github/workflows/feature-flags.yml`
- `.github/workflows/k8s-deploy.yml`
- `.github/workflows/knip.yml`
- `.github/workflows/labeler.yml`
- `.github/workflows/lighthouse.yml`
- `.github/workflows/lint-autofix.yml`
- `.github/workflows/lint.yml`
- `.github/workflows/performance.yml`
- `.github/workflows/pr-test-suite.yml`
- `.github/workflows/pr-verify.yml`
- `.github/workflows/preview.yml`
- `.github/workflows/qa-console-full.yml`
- `.github/workflows/release.yml`
- `.github/workflows/rollback.yml`
- `.github/workflows/security-scan.yml`
- `.github/workflows/security.yml`
- `.github/workflows/semantic-release.yml`
- `.github/workflows/size.yml`
- `.github/workflows/stale.yml`
- `.github/workflows/stress-test.yml`
- `.github/workflows/terraform.yml`
- `.github/workflows/test.yml`
- `.github/workflows/visual-regression.yml`

Os helpers dos corretores anteriores são cobertos por suites de regressão em fixtures; a chamada operacional original continua no respectivo hook/workflow. Os quatro registros principais e helpers ficam explícitos no JSON, sem globs para novos arquivos.
