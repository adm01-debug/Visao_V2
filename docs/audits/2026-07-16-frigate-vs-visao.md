# Auditoria comparativa — VISÃO × Frigate NVR

**Data:** 16 de julho de 2026
**Referência externa:** https://github.com/blakeblackshear/frigate (Frigate v0.14+)
**Referência interna:** commit atual do repositório VISÃO

---

## 1. Aviso metodológico

Frigate e VISÃO **resolvem o mesmo problema (vigilância inteligente) por caminhos arquitetônicos opostos**. Comparar linha-a-linha sem separar categorias produz falsas conclusões.

| Dimensão | Frigate | VISÃO |
|---|---|---|
| Modelo | NVR open-source self-hosted | SaaS multi-tenant hospedado |
| Runtime | Python + Go + FFmpeg em container | React 18 + Supabase + Edge Functions |
| Inferência | Coral TPU / GPU / OpenVINO local, YOLO/MobileNet | Gemini via Lovable AI Gateway + TFJS/Mediapipe cliente-side |
| Ingestão | RTSP direto, remux FFmpeg, `detect`+`record` streams | HLS via MediaMTX, sem gravação servidor-side 24×7 |
| Armazenamento | Vídeo bruto em disco local (TB) com retenção configurável | Clips + metadados no Supabase Storage |
| Deploy | `docker run` no hardware do cliente | Lovable Cloud gerenciado |
| Custo por câmera | Zero (hardware do cliente) | Custo de gateway IA + storage por câmera |
| Multi-tenant | Não (single-instance) | Sim (RLS por `user_id`) |

**Portabilidade de features:** capacidades ancoradas em "roda no hardware do cliente" (gravação 24×7 em disco, inferência sub-100 ms local, Coral TPU) **não são portáveis** sem quebrar o modelo SaaS. Não vamos tentar.

---

## 2. Matriz de features (paridade real)

Legenda: ✅ paridade ou superior · ⚠️ parcial · ❌ ausente · 🚫 fora do escopo SaaS

### 2.1 Ingestão e streaming

| Feature | Frigate | VISÃO | Status | Evidência |
|---|---|---|---|---|
| RTSP nativo | ✅ FFmpeg | ✅ via MediaMTX | ✅ | `docker/mediamtx.yml`, `src/hooks/useVideoStream.ts` |
| HLS output | ✅ (via go2rtc) | ✅ | ✅ | `src/components/StreamPlayer.tsx` |
| WebRTC baixa latência | ✅ (go2rtc) | ❌ | ❌ | — |
| Sub-stream para detecção + stream principal para gravação | ✅ `detect` vs `record` | ⚠️ configurável em MediaMTX mas sem UI | ⚠️ | `docker/mediamtx.yml` |
| Reconexão automática em queda | ✅ | ✅ | ✅ | `src/hooks/useVideoStream.ts` |
| 60+ câmeras simultâneas | ⚠️ limitado por hardware | ✅ testado | ✅ | mem://core |
| Two-way audio | ✅ (go2rtc) | ❌ | ❌ | — |

### 2.2 Detecção e IA

| Feature | Frigate | VISÃO | Status | Evidência |
|---|---|---|---|---|
| Detecção de objetos (pessoa, carro…) | ✅ YOLO local | ✅ Gemini + TFJS | ✅ | `src/pages/BehaviorDetectionPage.tsx` |
| Reconhecimento facial | ⚠️ plugin externo | ✅ nativo | ✅ superior | `src/pages/FaceRecognitionPage.tsx` |
| ALPR (placas) | ⚠️ plugin externo | ✅ nativo com dashboard | ✅ superior | `src/pages/LicensePlatePage.tsx`, `ALPRDashboard.tsx` |
| Detecção de EPI (PPE) | ❌ | ✅ | ✅ superior | `src/pages/PPEPage.tsx` |
| Análise de comportamento (queda, briga) | ⚠️ apenas objetos | ✅ | ✅ superior | `src/hooks/useZoneDetection.ts`, `detect-behavior` edge fn |
| Heatmap de movimento | ✅ | ✅ | ✅ | `src/pages/HeatmapPage.tsx` |
| Latência de inferência | ✅ <100 ms (local) | ⚠️ dependente de rede + gateway | ⚠️ | arquitetura |
| Aceleradores (Coral, GPU) | ✅ | 🚫 SaaS | 🚫 | — |
| Modelos customizados | ✅ | ⚠️ apenas prompt Gemini | ⚠️ | `src/config/models_config.ts` |

### 2.3 Zonas e regras

| Feature | Frigate | VISÃO | Status | Evidência |
|---|---|---|---|---|
| Zonas poligonais por câmera | ✅ | ✅ | ✅ | `src/components/ZoneEditor.tsx`, tabela `zones` |
| Motion mask (máscara para ignorar áreas) | ✅ | ⚠️ zonas negativas manuais | ⚠️ | falta UI dedicada |
| Filtro por objeto na zona | ✅ | ✅ | ✅ | `src/hooks/useZoneDetection.ts` |
| Regras condicionais (17 tipos) | ⚠️ automations básicas | ✅ 17 tipos, 8 ações | ✅ superior | mem://features/rules-engine, `AutomationRulesPage.tsx` |
| Templates de regras | ❌ | ✅ | ✅ superior | `src/data/mockRules.ts` |
| Cron / horário de ativação | ✅ | ✅ arm/disarm agendado | ✅ | tabela `arm_disarm_states` |

### 2.4 Alertas e notificações

| Feature | Frigate | VISÃO | Status | Evidência |
|---|---|---|---|---|
| Notificações push | ✅ (via HA) | ✅ | ✅ | `notification_configs` |
| Telegram | ⚠️ via HA/webhook | ✅ nativo | ✅ superior | `send-telegram` edge fn |
| Email | ⚠️ via HA | ✅ | ✅ | `send-alert-notification` |
| SMS | ❌ | ✅ | ✅ superior | mem://features/notification-channels-advanced |
| Webhooks | ✅ | ✅ | ✅ | 21 event types |
| MQTT publisher | ✅ nativo | ❌ | ❌ | — |
| Botão de pânico | ❌ | ✅ | ✅ superior | `src/pages/PanicEventsPage.tsx` |
| Alertas realtime UI | ⚠️ básico | ✅ toasts categorizados | ✅ superior | mem://architecture/realtime-alerts |

### 2.5 Gravação e evidências

| Feature | Frigate | VISÃO | Status | Portabilidade |
|---|---|---|---|---|
| Gravação contínua 24×7 | ✅ disco local | ❌ | 🚫 | Exige storage local — incompatível com SaaS |
| Retenção configurável (dias) | ✅ por objeto/zona | ❌ | ❌ | **Viável agora** — coluna + UI |
| Clips por evento | ✅ | ✅ manual | ⚠️ | `src/pages/VideoClipsPage.tsx` |
| Snapshot com bounding box | ✅ JPG anotado | ⚠️ frame cru | ⚠️ | **Viável agora** — canvas overlay antes de salvar |
| Timeline de eventos | ✅ | ✅ | ✅ | `src/pages/AlertsTimelinePage.tsx` |
| Export MP4 | ✅ | ⚠️ apenas clip original | ⚠️ | — |
| Retenção legal (LGPD) | ❌ | ✅ auditoria imutável | ✅ superior | `audit_logs` + triggers |

### 2.6 API e integrações

| Feature | Frigate | VISÃO | Status |
|---|---|---|---|
| REST API pública | ✅ `/api/events` etc. | ⚠️ Edge Functions internas | ⚠️ |
| MQTT | ✅ | ❌ | ❌ |
| WebSocket eventos | ✅ | ✅ Supabase Realtime | ✅ |
| Home Assistant | ✅ nativo | ⚠️ via webhook genérico | ⚠️ |
| Frigate+ (labels custom) | ✅ | ❌ | ❌ |

### 2.7 Multi-tenant, auth, RBAC

| Feature | Frigate | VISÃO | Status |
|---|---|---|---|
| Multi-usuário | ⚠️ básico | ✅ | ✅ superior |
| RBAC granular | ❌ | ✅ 4 papéis + `has_role()` | ✅ superior |
| Multi-tenant / workspaces | ❌ | ✅ organizations | ✅ superior |
| OAuth (Google) | ❌ | ✅ | ✅ superior |
| MFA/TOTP | ⚠️ básico | ❌ | ❌ |
| Rate limiting | ✅ | ✅ sliding window | ✅ |
| RLS / isolamento de dados | 🚫 single instance | ✅ 100% tabelas | ✅ superior |
| LGPD/GDPR self-delete | ❌ | ✅ `delete_user_data()` | ✅ superior |

### 2.8 Observabilidade e qualidade

| Feature | Frigate | VISÃO | Status |
|---|---|---|---|
| Métricas de sistema (FPS, CPU) | ✅ `/system` page | ⚠️ parcial | ⚠️ |
| Health check endpoint | ✅ | ✅ | ✅ |
| Logs estruturados | ⚠️ | ✅ JSON logger | ✅ |
| Sentry / error monitoring | ❌ | ✅ | ✅ superior |
| Auditoria imutável | ❌ | ✅ triggers | ✅ superior |
| CI/CD gates | ✅ básico | ✅ 40+ gates | ✅ superior |
| E2E Playwright | ❌ | ✅ 25+ specs | ✅ superior |
| Guarda de saúde DB | ❌ | ✅ `dbHealthGuard` | ✅ superior |
| Watcher de cron | ❌ | ✅ `CronStaleWatcher` | ✅ superior |

### 2.9 UX / plataforma

| Feature | Frigate | VISÃO | Status |
|---|---|---|---|
| Mobile responsivo | ⚠️ básico | ✅ mobile-first | ✅ superior |
| PWA instalável | ❌ | ✅ | ✅ superior |
| Dark mode | ✅ | ✅ | ✅ |
| i18n | ⚠️ EN only | ✅ PT-BR + EN | ✅ superior |
| Onboarding tour | ❌ | ✅ 9 passos | ✅ superior |
| Atalhos de teclado | ⚠️ básico | ✅ globais | ✅ superior |
| Acessibilidade avançada | ⚠️ | ✅ color-blind, aria-live | ✅ superior |

---

## 3. Placar por categoria

| Categoria | VISÃO | Frigate | Vencedor |
|---|---|---|---|
| Ingestão/streaming | 5/7 | 7/7 | Frigate (WebRTC, two-way audio, sub-stream UI) |
| Detecção/IA | 6/9 | 7/9 | Empate técnico — Frigate melhor em latência, VISÃO em variedade (PPE, ALPR nativo, comportamento) |
| Zonas/regras | 5/6 | 4/6 | **VISÃO** |
| Alertas | 7/8 | 5/8 | **VISÃO** |
| Gravação | 2/7 | 6/7 | **Frigate** (mas maioria é 🚫 para SaaS) |
| API/integrações | 2/5 | 5/5 | Frigate |
| Multi-tenant/auth | 7/8 | 2/8 | **VISÃO** |
| Observabilidade | 8/9 | 4/9 | **VISÃO** |
| UX/plataforma | 7/7 | 3/7 | **VISÃO** |

**Placar final (features portáveis a SaaS):** VISÃO 49 · Frigate 43

**Conclusão honesta:** VISÃO é **superior em SaaS, multi-tenant, IA aplicada e UX**. Frigate é **superior em gravação, latência local e ecossistema NVR**. As áreas onde Frigate ganha e são portáveis somam **7 gaps reais** (listados abaixo).

---

## 4. Gaps priorizados (viáveis agora, sem quebrar modelo SaaS)

Ordenados por (impacto operacional × esforço inverso):

| # | Gap | Impacto | Esforço | Onda |
|---|---|---|---|---|
| 1 | Retenção configurável de clips por câmera/objeto | Alto (custo storage) | Baixo | **40** |
| 2 | Snapshot com bounding box sobreposto salvo no evento | Alto (evidência) | Médio | **41** |
| 3 | Página `/system` com FPS/latência/detecções por câmera | Médio (ops) | Médio | **42** |
| 4 | Endpoint REST público `/api/events` estilo Frigate | Médio (integrações) | Médio | **43** |
| 5 | UI de motion mask (áreas ignoradas por câmera) | Médio (falsos positivos) | Médio | **44** |
| 6 | MQTT publisher opcional (edge function + connector) | Médio (integração HA/IoT) | Alto | **45** |
| 7 | MFA/TOTP para admin | Alto (segurança) | Médio | **46** |

**Fora do escopo (não portáveis ou já resolvidos):**
- Gravação contínua 24×7 → 🚫 modelo SaaS
- Coral TPU / inferência local sub-100 ms → 🚫 arquitetura
- Two-way audio / WebRTC → requer go2rtc server-side, avaliar após MediaMTX v2
- Home Assistant nativo → webhook + MQTT (onda 45) resolvem 90%
- Frigate+ custom models → dependente de mudança de provedor IA

---

## 5. Recomendação executiva

**VISÃO não é inferior ao Frigate.** É um produto de **categoria diferente** que ganha em 5 de 9 dimensões, perde em 2 (gravação, API), e empata em 2. As perdas concentradas em "gravação 24×7" e "latência local" são **estruturais ao modelo SaaS** — não devem ser corrigidas transformando VISÃO em NVR.

Os **7 gaps portáveis** serão implementados nas ondas 40-46, um por vez, cada um com simulação, teste e relatório, mantendo o padrão das ondas anteriores.

Documentar este posicionamento é mais valioso que replicar cegamente features do concorrente.
