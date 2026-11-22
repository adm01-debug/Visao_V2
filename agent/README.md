# VISÃO — Agente Local ONVIF

Serviço leve que roda **dentro da rede das câmeras** para:

1. Descobrir dispositivos ONVIF via WS-Discovery multicast (239.255.255.250:3702).
2. Fazer probe SOAP (`GetDeviceInformation`, `GetStreamUri`) em cada IP encontrado.
3. Enviar os resultados por HTTPS ao backend VISÃO (`agent-ingest`).
4. Emitir heartbeat periódico para o dashboard saber que está online.

## Por que este agente existe

As Edge Functions do backend rodam na nuvem e **não têm rota** até IPs de LAN (192.168.x.x, 10.x.x.x, etc). Um agente rodando na mesma rede das câmeras contorna isso — só ele precisa de acesso local; o backend recebe apenas endpoints já resolvidos.

## Requisitos

- Rede com acesso multicast (não bloqueado por switch/roteador).
- Node.js **20+** ou Docker.
- Token opaco gerado em **Agentes Locais → Adicionar agente** no dashboard.

## Docker (recomendado)

```bash
docker run -d --restart=unless-stopped \
  --name visao-agent --network host \
  -e BACKEND_URL="https://pmzxbffnbenkmzpnbehb.supabase.co" \
  -e AGENT_TOKEN="<cole aqui>" \
  -e ONVIF_USERNAME="admin" \
  -e ONVIF_PASSWORD="<senha ONVIF>" \
  -e DISCOVERY_INTERVAL=300 \
  ghcr.io/visao/agent:latest
```

> `--network host` é **obrigatório** — WS-Discovery usa multicast UDP que não atravessa a bridge do Docker.

## Node standalone

```bash
cd agent
cp .env.example .env  # edite BACKEND_URL, AGENT_TOKEN, credenciais ONVIF
npm ci
npm run build
npm start
```

## systemd (Linux)

```ini
[Unit]
Description=VISAO Local ONVIF Agent
After=network-online.target

[Service]
EnvironmentFile=/etc/visao-agent.env
ExecStart=/usr/bin/node /opt/visao-agent/dist/index.js
Restart=always
RestartSec=10
User=visao

[Install]
WantedBy=multi-user.target
```

## Variáveis de ambiente

| Variável             | Obrigatória    | Default | Descrição                                             |
| -------------------- | -------------- | ------- | ----------------------------------------------------- |
| `BACKEND_URL`        | ✅             | —       | URL do projeto Supabase (`https://<ref>.supabase.co`) |
| `AGENT_TOKEN`        | ✅             | —       | Token opaco emitido no dashboard                      |
| `ONVIF_USERNAME`     | ⚠️ recomendado | —       | Usuário ONVIF (senão só endpoint bruto é reportado)   |
| `ONVIF_PASSWORD`     | ⚠️ recomendado | —       | Senha ONVIF                                           |
| `NETWORK_CIDR`       | opcional       | —       | Ex.: `192.168.3.0/24` — apenas informativo            |
| `HEARTBEAT_INTERVAL` | opcional       | `30`    | Segundos entre heartbeats                             |
| `DISCOVERY_INTERVAL` | opcional       | `300`   | Segundos entre scans ONVIF                            |
| `LOG_LEVEL`          | opcional       | `info`  | `trace` / `debug` / `info` / `warn` / `error`         |

## Segurança

- O token é armazenado **hash SHA-256** no backend; o valor em claro só é mostrado uma vez.
- Revogação instantânea via botão **Revogar** no dashboard (`agent-ingest` passa a rejeitar 401).
- Comunicação sempre HTTPS. O agente nunca abre portas de entrada.
- Descobertas são visíveis somente para o dono da conta (RLS `auth.uid() = user_id`).

## Troubleshooting

- **`missing_env`** — verifique `.env` ou `-e` do Docker.
- **`invalid_token`** — o token foi revogado ou digitado errado. Gere um novo.
- **`ws_discovery_done count=0`** — multicast bloqueado. Confirme `--network host`, VLAN e IGMP snooping.
- **Descobertas sem `manufacturer/model/rtsp`** — credenciais ONVIF ausentes ou inválidas.
