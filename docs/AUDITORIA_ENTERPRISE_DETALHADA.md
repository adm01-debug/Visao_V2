# AUDITORIA ENTERPRISE - SISTEMA VISÃO (V2.2.0)

## 1. RESUMO EXECUTIVO

O **Sistema VISÃO** é uma plataforma de vigilância inteligente de classe enterprise, fundamentada em Inteligência Artificial para processamento de vídeo em tempo real. A arquitetura é baseada em **React 18** com **TypeScript**, utilizando **Supabase** como infraestrutura de backend (BaaS) e **TensorFlow.js** para inferência de borda.

### Principais Indicadores

- **Cobertura de Funcionalidades:** No universo do checklist auditável desta auditoria (seção 3), 3 de 5 itens estão implementados e operacionais (MFA e bitrate adaptativo confirmados no código; pendem apenas S3/Azure e MQTT — ambos exigem infra externa). Não é a cobertura de todo o sistema: a contagem reconciliada de `ESTADO_ATUAL.md` (linhas 47-64) mede **20,5% de operacional em 263 itens de 5 dimensões** comparáveis, e **exclui 3 dimensões por incompatibilidade declarada de critérios** (04-DADOS, 02-LOGICA, 08-RUNTIME), não por omissão — por isso o número não é um inventário exaustivo do sistema inteiro.
- **Segurança:** Implementação robusta de RLS (Row Level Security) e RBAC (Role-Based Access Control).
- **Escalabilidade:** Pronta para multi-camera com suporte a HLS e streaming adaptativo.
- **Resiliência:** Implementação de Circuit Breaker, Offline Sync e tratamento de erros granular.

### Riscos e Lacunas

- **Performance de IA:** Dependência de recursos de hardware do cliente (inferência via browser). Recomendado monitoramento de uso de CPU/GPU.
- **Conectividade:** Embora possua offline storage, a funcionalidade de sincronização contínua sob baixa latência requer testes de estresse adicionais.

---

## 2. INVENTÁRIO DE FUNCIONALIDADES E MÓDULOS

### 2.1 Módulo de Monitoramento e Câmeras

| Funcionalidade             | Status       | Motivo de Existir                                            | Evidência (Arquivo/Path)                                           |
| :------------------------- | :----------- | :----------------------------------------------------------- | :----------------------------------------------------------------- |
| Visualização em Tempo Real | Implementado | Monitoramento direto de streams RTSP/HLS.                    | `src/components/StreamPlayer.tsx`, `src/hooks/useVideoStream.ts`   |
| Gerenciamento de Câmeras   | Implementado | CRUD de dispositivos e configurações de rede.                | `src/pages/CamerasPage.tsx`, `src/hooks/useCameras.ts`             |
| Mapa de Dispositivos       | Implementado | Localização geoespacial das câmeras via Mapbox.              | `src/components/CameraMap.tsx`, `src/hooks/useMap.ts`              |
| Controle de Armar/Desarmar | Implementado | Ativação/desativação rápida do sistema de alerta por câmera. | `src/components/ArmDisarmControl.tsx`, `src/hooks/useArmDisarm.ts` |
| Detecção de Movimento      | Implementado | Gatilho inicial para economia de processamento e alertas.    | `src/constants/features.ts` (FEATURE: MOTION_DETECTION)            |

### 2.2 Inteligência Artificial e Reconhecimento

| Funcionalidade           | Status       | Motivo de Existir                                     | Evidência (Arquivo/Path)                                               |
| :----------------------- | :----------- | :---------------------------------------------------- | :--------------------------------------------------------------------- |
| Reconhecimento Facial    | Implementado | Identificação de pessoas autorizadas e blacklist.     | `src/pages/FaceRecognitionPage.tsx`, `src/hooks/useFaceRecognition.ts` |
| Leitura de Placas (ALPR) | Implementado | Controle de acesso veicular e rastreamento de frotas. | `src/pages/LicensePlatePage.tsx`, `src/components/ALPRDashboard.tsx`   |
| Detecção de EPIs (PPE)   | Implementado | Segurança do trabalho e conformidade normativa.       | `src/pages/PPEPage.tsx`, `src/hooks/usePPEDetection.ts`                |
| Análise de Comportamento | Implementado | Detecção de quedas, brigas ou invasão de perímetro.   | `src/pages/BehaviorDetectionPage.tsx`, `src/hooks/useZoneDetection.ts` |
| Mapa de Calor (Heatmap)  | Implementado | Análise de fluxo de pessoas e ocupação de espaços.    | `src/pages/HeatmapPage.tsx`, `src/hooks/useHeatmap.tsx`                |

### 2.3 Gestão de Alertas e Automação

| Funcionalidade            | Status       | Motivo de Existir                                                | Evidência (Arquivo/Path)                                                  |
| :------------------------ | :----------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------ |
| Linha do Tempo de Alertas | Implementado | Registro histórico visual de todos os eventos críticos.          | `src/pages/AlertsTimelinePage.tsx`, `src/components/EventTimeline.tsx`    |
| Regras de Automação       | Implementado | Configuração de ações (Webhooks, Telegram) baseadas em gatilhos. | `src/pages/AutomationRulesPage.tsx`, `src/hooks/useRules.ts`              |
| Integração Telegram       | Implementado | Notificações instantâneas em dispositivos móveis.                | `src/components/TelegramConfig.tsx`, `src/pages/TelegramSettingsPage.tsx` |
| Botão de Pânico           | Implementado | Acionamento manual de emergência com log de auditoria.           | `src/components/PanicButton.tsx`, `src/pages/PanicEventsPage.tsx`         |

### 2.4 Relatórios e Auditoria

| Funcionalidade             | Status       | Motivo de Existir                                               | Evidência (Arquivo/Path)                                                             |
| :------------------------- | :----------- | :-------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| Exportação de Relatórios   | Implementado | Geração de PDFs e CSVs para fins legais e gerenciais.           | `src/lib/pdfGenerator.ts`, `src/lib/exportUtils.ts`                                  |
| Log de Auditoria           | Implementado | Rastreabilidade de ações de usuários (quem fez o quê e quando). | `src/hooks/useAuditLogs.ts`, `src/integrations/supabase/types.ts`                    |
| Dashboard de Produtividade | Implementado | Métricas de eficiência da operação de vigilância.               | `src/pages/ProductivityDashboardPage.tsx`                                            |
| Histórico de Análises      | Implementado | Log detalhado de inferências de IA para debug e treinamento.    | `src/components/AnalysisHistoryPanel.tsx`, `src/hooks/useRealtimeAnalysisHistory.ts` |

---

## 3. CHECKLIST AUDITÁVEL (IMPLEMENTADO VS. A IMPLEMENTAR)

| Item                                      | Prioridade | Status        | Critério de Aceitação                                                                                                                                                                                                            |
| :---------------------------------------- | :--------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação Multi-fator (MFA)            | ALTA       | Implementado  | TOTP via challenge AAL2 para contas com fator verificado quando a sessão ainda não está em AAL2.                                                                                                                                 |
| Gravação em Nuvem (S3/Azure)              | MÉDIA      | A Implementar | Upload automático para buckets externos. **Requer infra + secrets (Regra 8).**                                                                                                                                                   |
| Modo de Baixa Largura de Banda            | BAIXA      | Implementado  | Bitrate adaptativo via autoLevelCapping no modo automático do hls.js; **abaixa o teto de qualidade** e, quando a variante em reprodução excede o novo teto, hls.js troca para uma variante inferior disponível (useStreamStats). |
| Integração com Sistemas de Alarme Legados | MÉDIA      | A Implementar | API para comunicação com centrais de alarme via MQTT/HTTP.                                                                                                                                                                       |
| Multi-tenancy (Workspaces)                | ALTA       | Implementado  | Isolamento total de dados entre diferentes empresas/unidades.                                                                                                                                                                    |

---

## 4. MATRIZ DE RISCOS (PROBABILIDADE X IMPACTO)

| Categoria       | Risco                               | Prob. | Impacto | Mitigação                                         |
| :-------------- | :---------------------------------- | :---- | :------ | :------------------------------------------------ |
| Segurança       | Vazamento de credenciais            | Baixa | Crítico | Uso de Supabase Auth + RLS rigoroso.              |
| Integridade     | Perda de frames em rede instável    | Alta  | Médio   | Buffer local e reconexão automática (Resilience). |
| Conformidade    | Exposição de dados sensíveis (LGPD) | Média | Alto    | Anonimização de rostos não autorizados em logs.   |
| Disponibilidade | Queda do servidor de streaming      | Baixa | Crítico | Monitoramento contínuo e failover configurado.    |

---

## 5. RECOMENDAÇÕES ACIONÁVEIS

1. **Refinar Inferência:** Migrar modelos pesados para WebGL/WebGPU para reduzir carga na CPU.
2. **Auditoria Contínua:** Implementar o checklist operacional (`src/hooks/useAuditLogs.ts`) semanalmente.
3. **Segurança:** Habilitar MFA para todos os usuários com nível de acesso ADMIN.
4. **UX:** Otimizar o tempo de carregamento de vídeos (Time to First Frame) em conexões 4G/5G.

---

**Auditoria gerada automaticamente em:** 14 de Maio de 2026
**Responsável:** Lovable AI Auditor
**Versão do Documento:** 1.0.0
