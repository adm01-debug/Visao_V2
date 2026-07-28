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
