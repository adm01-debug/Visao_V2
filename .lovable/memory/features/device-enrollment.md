---
name: Conexão por Registro
description: Onda 190 — dispositivos remotos atrás de NAT se registram com código + segredo; segredo só em digest, graça de rotação de 5min, revogação terminal
type: feature
---
Rota `/dispositivos` (protegida, item "Conexão por Registro" no grupo Monitoramento). Paridade com a Conexão por Registro do SIM Next: o gravador em campo é quem procura o servidor, então a única prova de identidade é o segredo de registro.

**Regra única** em `src/lib/devices/deviceEnrollment.ts` (pura — não fala com banco, não calcula hash):
- **Segredo nunca existe em claro no banco**: só o digest SHA-256 hex(64). O texto aparece uma única vez, no retorno de `enroll_device` / `rotate_device_secret`.
- **Revogação é terminal e vence tudo** — inclusive segredo correto, prazo válido e graça de rotação (que é apagada junto).
- **Prazo é do relógio, não do status**: `active` vencido é recusado.
- **Graça de rotação = 5min (`ROTATION_GRACE_MS`) e só da versão imediatamente anterior**; a antepenúltima nunca volta.
- **Relógio antes da emissão é anomalia** → recusa (`clock_anomaly`), jamais aceitação.
- **Recusa não vaza existência**: veredito público é sempre `denied`; o motivo detalhado vai só para a trilha.
- **Só aceitação move `lastSeenAt`** — senão força bruta manteria dispositivo morto "vivo". E `lastSeenAt` nunca anda para trás (também travado por trigger).

Banco: `device_registrations` (CHECKs de formato do código/hash, graça pareada, revogado com data) + `device_registration_audit` append-only. Ambas **somente-leitura para `authenticated`** e sem nenhuma policy de escrita: criar/rotacionar/revogar é exclusividade das rotinas `SECURITY DEFINER`. `anon` sem qualquer privilégio.

Validação: `npm run simulate:wave190` (207.956 asserções), `npm run db:check:device-enrollment` (inclui exercício dinâmico em transação revertida) e `src/__tests__/lib/deviceEnrollment.test.ts`.

## Onda 191 — porta pública `device-connect`

Edge function **sem JWT de pessoa** (o gravador não tem sessão), única entrada de rede da Onda 190. Regra da superfície em `supabase/functions/_shared/deviceConnect.ts`:
- **Recusa é uma constante**: todo `denied` sai como `401 {"connected":false}`, byte a byte igual — inexistente, revogado, vencido, segredo errado e graça encerrada são indistinguíveis. Só `not_json` vira 400 (não nomeia dispositivo).
- **Falha interna também cai na recusa canônica** — um 500 seria dica de existência.
- O segredo vira digest na primeira linha e **nunca** é logado, ecoado ou gravado.
- **Relógio e TTL são do servidor**; campos extras no corpo são descartados sem eco.
- **Toda tentativa vira linha na trilha**, inclusive de código desconhecido (`registration_id NULL`) — é assim que uma varredura fica visível.
- `secretStale` (usou graça) é a única informação extra, e só para quem já provou identidade.
- IP vem de `x-forwarded-for` normalizado; cabeçalho sujo vira `null` (perder o IP é melhor que perder a trilha, coluna é `inet`).

Espelho `_shared/deviceEnrollment.ts` é byte a byte igual a `src/lib/devices/deviceEnrollment.ts` (imposto pelo gate). Validação: `npm run simulate:wave191` (193.787 asserções, inclui fuzz de 120k estados) e `npm run db:check:device-connect`.
