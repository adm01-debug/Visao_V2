# Deploy e infraestrutura — VISÃO V2

Ler ao confirmar deploy, mexer em env var, domínio, Docker, k8s ou observabilidade.
Regras curtas em `AGENTS.md` (seção **Serviços**).

## 1. O que publica o front hoje

**Nenhum workflow deste repo faz deploy.** `deploy.yml` instala, roda `type-check:strict`, `npm run build`,
gera `version.json` e escreve no step summary — e termina. `cd.yml` é pior: todos os passos têm
`|| true` + `continue-on-error`, então ele é verde mesmo com build quebrado.

O que existe de verdade:

- **Vercel** — projeto `visao-v2` conectado a `github.com/adm01-debug/Visao_V2` (verificado via MCP Vercel).
  Build pelo `vercel.json`: `npm run build`, saída `dist`, rewrite SPA. Merge em `main` dispara o deploy
  pela integração do Vercel, não por workflow.
- **Limitação do MCP nesta sessão**: `list_deployments` responde **403 forbidden** para este projeto — o
  token enxerga o projeto, não os deploys. Para confirmar deploy: painel do Vercel, ou pedir ao dono um
  token com permissão. Não declare "deploy confirmado" sem isso.
- ⚠️ **O deploy do Vercel está falhando, inclusive na `main`.** Confirmado em sequência em pelo menos
  dois HEADs seguidos da `main` (`a075600` e, depois do merge da #166, `fdcdf8f`) com commit status
  `Vercel: failure` ("Deployment has failed") — e o mesmo acontece em PR. Ou seja: **merge em `main` não
  chega em produção**, não é um incidente pontual de um commit. Enquanto isso não for resolvido, "deploy
  confirmado" é impossível neste repo — diga isso em vez de assumir que subiu.

## 2. Oito alvos declarados, zero automatizados

`docs/estado/05-INFRA-CI.md:305-330` mediu os arquivos de plataforma na raiz. Resumo e as contradições
que já custaram tempo:

| Arquivo          | Promete                                       | Problema                                                         |
| ---------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| `vercel.json`    | estático `dist/`                              | alvo real, via integração                                        |
| `netlify.toml`   | estático `dist/`                              | sem workflow                                                     |
| `render.yaml`    | estático                                      | sem workflow                                                     |
| `app.yaml` (GAE) | `runtime: nodejs20`                           | CI usa Node 22 — divergência                                     |
| `fly.toml`       | container do `Dockerfile`                     | `min_machines_running = 0`                                       |
| `heroku.yml`     | build do `Dockerfile` **e** `npm run preview` | contraditório: a imagem é nginx na porta 80 (`Dockerfile:35-54`) |
| `Procfile`       | `vite preview`                                | `vite preview` é servidor de desenvolvimento, não de produção    |
| `railway.json`   | NIXPACKS + `vite preview`                     | idem                                                             |

Não adicione alvo novo. Se o dono quiser consolidar, é tarefa própria: escolher um, apagar os outros.

## 3. Variáveis de ambiente

- `VITE_*` entra no **bundle público** — nunca segredo de servidor com esse prefixo. O contrato é cobrado
  por `npm run check:env-contract` (`scripts/check-env-contract.mjs`), que roda no `prebuild` e no CI.
- Vite injeta em **build time**: valor errado no `.env.production` = bundle errado, e trocar a env no
  painel sem rebuild não muda nada.
- Segredos de servidor (OpenAI, Telegram, Resend, Mapbox, Bitrix24, credenciais do MediaMTX) vivem como
  secret de edge function (`supabase secrets set`), nunca no front. Lista em `.env.example`.
- `.env.production` hoje aponta para o Supabase **antigo** (`fsisdfdwlbfeadwfqpir`) — ver `banco.md` §1.
- `k8s/secrets.yaml` está versionado: nunca coloque valor real nele.

## 4. Container e Kubernetes

- `Dockerfile`: build multi-stage terminando em nginx servindo `/usr/share/nginx/html:80`
  (`docker/nginx.conf`). `npm run docker:build|docker:run|docker:push`.
- `k8s/`: `deployment.yaml`, `service.yaml`, `ingress.yaml`, `hpa.yaml`, `configmap.yaml`, `secrets.yaml`.
  Nenhum workflow aplica (`k8s-deploy.yml` não publica). `kubectl apply -f k8s/` é manual.
- `docker/` guarda o stack do MediaMTX (compose normal e Swarm) — ver `mediamtx-streaming.md`.
- Mexer em Dockerfile, k8s ou stack = **chame o dono** antes de mergear (`AGENTS.md` → Fluxo Git).

## 5. Observabilidade e processos auxiliares

| Caminho                       | O que é                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `observability/prometheus/`   | scrape configs e regras de alerta                                                                                                               |
| `observability/alertmanager/` | rotas de alerta (edge `alertmanager-silence` silencia)                                                                                          |
| `observability/grafana/`      | dashboards                                                                                                                                      |
| `observability/blackbox/`     | probes de disponibilidade                                                                                                                       |
| `agent/`                      | agente Node de descoberta/relay de câmeras na rede do cliente (`agent/src/discover.ts`, `relay.ts`, `sender.ts`); pareia pela edge `agent-pair` |
| `workers/media-uploader`      | upload de segmentos de gravação                                                                                                                 |

Edges de automonitoramento que já existem (não reinvente): `cron-watchdog`, `cron-watchdog-escalate`,
`fleet-health`, `camera-health-monitor`, `connectivity-resolution-alert`, `csp-anomaly-notify`,
`admin-slow-queries`.

## 6. Checklist de "deploy confirmado"

1. PR mergeada em `main` (squash).
2. Deploy do Vercel para o commit do merge em estado `READY` — painel, porque o MCP dá 403.
3. Comportamento verificado em produção: request real, log de edge function ou query. Sem os três,
   diga em que ponto parou (`AGENTS.md` → Bugs e funcionalidades).
