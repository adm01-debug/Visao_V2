# VisionAI — Levantamento Exaustivo de Funcionalidades

> Documento gerado a partir de todo o histórico de conversa e knowledge base do projeto.
> Última atualização: 2026-03-15

---

## 1. AUTENTICAÇÃO & GERENCIAMENTO DE USUÁRIOS

### 1.1 Login/Registro
- [x] Cadastro com email e senha (signup)
- [x] Login com email e senha (signin)
- [x] Auto-confirm de email habilitado (experiência simplificada)
- [x] Logout com limpeza de sessão
- [x] Contexto de autenticação (`AuthContext`) com `signUp`, `signIn`, `signOut`
- [x] Persistência de sessão (`localStorage`, `autoRefreshToken`)
- [x] Redirecionamento automático: não-autenticado → `/auth`, autenticado → `/dashboard`

### 1.2 Recuperação de Senha
- [x] Fluxo "Esqueci minha senha" na tela de Auth
- [x] Envio de email de reset via `resetPasswordForEmail`
- [x] Página `/reset-password` para redefinir senha com token
- [x] Rota `/auth/callback` para processar links de email
- [x] Validação de força de senha na redefinição
- [x] Feedback visual (loading, sucesso, erro)

### 1.3 Perfil de Usuário
- [x] Página `/profile` com edição de dados pessoais
- [x] Upload de avatar
- [x] Tabela `profiles` no banco (full_name, avatar_url, user_id)

### 1.4 Isolamento por Usuário
- [x] Todos os dados filtrados por `user_id` em operações CRUD
- [x] RLS (Row Level Security) em todas as tabelas
- [x] Cada usuário vê apenas seus próprios dados

---

## 2. DASHBOARD PRINCIPAL

### 2.1 Dashboard V2
- [x] Página `/dashboard` com estatísticas em cards
- [x] Contagem de câmeras ativas/offline/em alerta
- [x] Total de alertas por severidade
- [x] Pessoas detectadas em tempo real
- [x] Gráficos de histórico de alertas (últimos 7 dias)
- [x] Distribuição de alertas por tipo/severidade
- [x] Status das câmeras em grid visual

### 2.2 Dashboard Legado (Index)
- [x] Página `/` com abas: Dashboard, Regras, Câmeras (FloorPlan), Relatórios, AI Vision
- [x] Componente `Dashboard` com visão geral
- [x] `AnalyticsDashboard` com gráficos
- [x] `AIAnalysisPanel` para análise por IA
- [x] `BlacklistAlertBanner` para alertas de blacklist

---

## 3. GERENCIAMENTO DE CÂMERAS

### 3.1 CRUD de Câmeras
- [x] Página `/cameras` com listagem em grid/lista
- [x] Adicionar nova câmera (nome, localização, URL de stream)
- [x] Editar câmera existente
- [x] Excluir câmera
- [x] Status visual: online, offline, alert, warning
- [x] Thumbnail/preview de câmera

### 3.2 Geolocalização
- [x] Campos `latitude` e `longitude` na tabela cameras
- [x] Mapa de localização (FloorPlanMap)
- [x] Posicionamento geográfico de câmeras

### 3.3 Streaming de Vídeo
- [x] Componente `VideoStreamPlayer` para reprodução ao vivo
- [x] Suporte a URLs de stream (RTSP/HLS)
- [x] Página `/stream-settings` para configuração de streams
- [x] `StreamConfigPanel`: presets de transcodificação, comandos FFmpeg/Docker/MediaMTX
- [x] Player de preview integrado
- [x] Guia de troubleshooting para streams

---

## 4. SISTEMA DE ALERTAS

### 4.1 Gerenciamento de Alertas
- [x] Página `/alerts` com listagem completa
- [x] Filtros por tipo: security, safety, operations, access, analytics
- [x] Filtros por severidade: low, medium, high, critical
- [x] Marcação de alertas como lidos/não-lidos
- [x] Exclusão de alertas
- [x] Thumbnail associado ao alerta

### 4.2 Alertas em Tempo Real (Realtime)
- [x] Supabase Realtime subscrevendo INSERT/UPDATE/DELETE na tabela `alerts`
- [x] Notificações toast categorizadas por severidade
- [x] Notificações push do navegador (com `requireInteraction` para críticos/altos)
- [x] Sons de alerta com presets: Discreto, Padrão, Urgente
- [x] Configuração de sons por severidade
- [x] Mute state persistido em localStorage

### 4.3 Configuração de Notificações
- [x] Página `/notification-settings`
- [x] Canais: push, email, SMS, webhook
- [x] Destinatários de email e telefone
- [x] URLs de webhook
- [x] Filtro por severidade
- [x] Cooldown entre notificações (minutos)
- [x] Agendamento: dias da semana, horário início/fim
- [x] Tabela `notification_configs`

---

## 5. RECONHECIMENTO FACIAL

### 5.1 Gerenciamento de Pessoas
- [x] Página `/people` com CRUD completo
- [x] Cadastro: nome, departamento, cargo, notas
- [x] Tipo de lista: whitelist, blacklist, visitante
- [x] Upload de foto com validação (máx 5MB)
- [x] Captura por webcam (frontal/traseira)
- [x] Status ativo/inativo
- [x] Tabela `registered_persons`

### 5.2 Detecção e Reconhecimento
- [x] Página `/face-recognition`
- [x] Edge function `detect-faces`: detecção automática de rostos
- [x] Geração de face encodings
- [x] Edge function `compare-faces`: comparação em tempo real
- [x] Validação de qualidade mínima (MIN_FACE_QUALITY: 0.5)
- [x] Overlay de reconhecimento facial (`FaceRecognitionOverlay`)
- [x] Armazenamento em bucket `person-photos` (Supabase Storage)
- [x] Componente `useFaceAPI` para integração com face-api.js

### 5.3 Configuração de Reconhecimento
- [x] Tabela `face_recognition_configs`
- [x] Match threshold configurável
- [x] Alerta em faces desconhecidas
- [x] Salvamento de faces desconhecidas
- [x] Detecção de múltiplas faces
- [x] Máximo de faces por frame
- [x] Tamanho mínimo de face
- [x] Qualidade mínima de face
- [x] Cooldown de alertas
- [x] Vinculação a câmera específica

### 5.4 Logs e Analytics de Reconhecimento
- [x] Página `/recognition-logs` com histórico filtrável
- [x] Tabela `recognition_logs` (camera_id, person_id, confidence, recognized, image_url)
- [x] Página `/recognition-analytics` com gráficos:
  - Tendências ao longo do tempo
  - Distribuição por hora do dia
  - Distribuição por dia da semana
  - Taxa de reconhecimento
  - Distribuição por câmera
- [x] Seletor de intervalo de datas
- [x] Filtros por período, câmera e pessoa

---

## 6. RECONHECIMENTO DE PLACAS (ALPR)

### 6.1 Gerenciamento de Veículos
- [x] Página `/license-plate` com abas Dashboard/Detecção
- [x] CRUD completo de veículos na tabela `registered_plates`
- [x] Campos: placa, proprietário, tipo de veículo, cor, notas
- [x] Tipo de lista: Blacklist, Whitelist, Visitante
- [x] Status ativo/inativo

### 6.2 Detecções
- [x] Tabela `plate_detections` com histórico
- [x] Campos: placa, câmera, confiança, direção, tipo de veículo, imagem
- [x] Filtros por tipo de lista
- [x] Busca por placa
- [x] Exportação de histórico para CSV

### 6.3 Dashboard ALPR
- [x] Métricas: total detectado, detecções hoje, veículos únicos, alertas blacklist
- [x] Taxa de autorização e confiança média
- [x] Gráficos: detecções por dia/hora, distribuição de status, detecções por câmera
- [x] Histórico filtrável de veículos

---

## 7. ZONAS DE MONITORAMENTO

### 7.1 Gerenciamento de Zonas
- [x] Página `/zones` com CRUD completo
- [x] Definição de áreas por pontos (polígonos)
- [x] Tipos de zona configuráveis
- [x] Cor personalizada por zona
- [x] Vinculação a câmera específica
- [x] Status ativo/inativo
- [x] Tabela `zones`

### 7.2 Eventos de Zona
- [x] Tabela `zone_events` (zone_id, event_type, detected_objects, timestamp)
- [x] Overlay visual de zonas (`ZoneOverlay`)

---

## 8. MOTOR DE REGRAS E AUTOMAÇÃO

### 8.1 Regras Personalizáveis
- [x] Página `/automation-rules`
- [x] CRUD completo de regras na tabela `rules`
- [x] Condições múltiplas com tipos:
  - people_count, no_ppe, restricted_area, face_recognition
  - vehicle_detection, loitering, crowd_density, motion_detection
  - object_left, perimeter_breach
- [x] Operadores: greater_than, less_than, equals, not_equals, contains, between
- [x] Ações: alert, notify, record, lockdown, dispatch
- [x] Categorias: security, safety, operations, access, analytics
- [x] Severidade: low, medium, high, critical
- [x] Seleção de câmeras específicas
- [x] Agendamento (dias e horários)
- [x] Editor com validação
- [x] Painel visual (`RulesPanel`)

### 8.2 Execuções de Regras
- [x] Tabela `rule_executions` com histórico
- [x] Status de execução
- [x] Ações executadas
- [x] Tempo de execução (ms)
- [x] Mensagem de erro (se houver)
- [x] Vinculação a alerta gerado

---

## 9. DETECÇÃO DE EPI (PPE)

- [x] Página `/ppe` dedicada
- [x] Detecção de equipamentos de proteção individual
- [x] Integração com sistema de alertas (condição `no_ppe`)
- [x] Visualização de detecções

---

## 10. GRAVAÇÕES DE VÍDEO

- [x] Página `/recordings`
- [x] Tabela `video_clips` (camera_id, start_time, end_time, duration, file_url, thumbnail_url, status)
- [x] Listagem de clips de vídeo
- [x] Filtros e busca
- [x] Vinculação a câmera

---

## 11. ANALYTICS E RELATÓRIOS

### 11.1 Analytics
- [x] Página `/analytics` com dashboards visuais
- [x] Gráficos de área (`AreaChart`) para tendências
- [x] Distribuição de alertas por tipo e severidade
- [x] Métricas por câmera

### 11.2 Relatórios
- [x] Página `/reports` com geração de relatórios
- [x] Exportação de dados (CSV)
- [x] `exportUtils` para formatação e download
- [x] Relatórios filtráveis por período

### 11.3 Histórico de Análises
- [x] Tabela `analysis_history` (analysis_type, camera_id, result, confidence, image_url)
- [x] Histórico de análises por IA

---

## 12. MAPA DE CALOR (HEATMAP)

- [x] Página `/heatmap`
- [x] Visualização de densidade de atividade
- [x] Dados agregados por localização

---

## 13. SEGURANÇA DO SISTEMA

- [x] Página `/security` com visão geral de segurança
- [x] Monitoramento de acessos e ameaças
- [x] Integração com alertas de segurança

---

## 14. CONFIGURAÇÕES

### 14.1 Configurações Gerais
- [x] Página `/settings`
- [x] Preferências do sistema

### 14.2 Telegram
- [x] Página `/telegram-settings`
- [x] Integração com bot do Telegram para notificações

### 14.3 Tema
- [x] `ThemeProvider` com suporte a dark/light mode
- [x] Persistência de preferência de tema

---

## 15. INTERFACE E UX

### 15.1 Layout
- [x] `MainLayout` com Sidebar + Header + BottomNavigation
- [x] Sidebar navegável com todas as seções
- [x] Header com busca global e notificações
- [x] Bottom navigation para mobile
- [x] `SwipeableView` para navegação por gestos

### 15.2 Busca Global
- [x] SearchInput no header com debounce 300ms
- [x] Pesquisa em câmeras (nome/localização) e alertas (mensagem/câmera)
- [x] Navegação por teclado (ArrowUp/Down, Enter, Escape)
- [x] Atalho global Ctrl+K

### 15.3 Notificações na UI
- [x] Painel de notificações com histórico completo
- [x] Filtros por tipo/severidade/status de leitura
- [x] Configuração de sons com presets e preview
- [x] Toast notifications (Sonner)

### 15.4 Responsividade
- [x] Layout adaptável desktop/tablet/mobile
- [x] Bottom navigation em mobile
- [x] Sidebar colapsável

### 15.5 Acessibilidade
- [x] `SkipLink` para conteúdo principal
- [x] Roles e aria-labels em elementos-chave
- [x] Navegação por teclado

### 15.6 Performance
- [x] Lazy loading de todas as páginas (React.lazy + Suspense)
- [x] Code splitting por rota
- [x] QueryClient com staleTime de 5min e retry 1
- [x] PWA com Service Worker (`registerSW.js`, `manifest.webmanifest`)

### 15.7 Tratamento de Erros
- [x] `ErrorBoundary` global
- [x] `LoadingSpinner` e `PageLoadingSkeleton`
- [x] `PageSkeletons` por tipo de página
- [x] Página `/acesso-negado` para acesso negado
- [x] Página 404 (`NotFound`)

---

## 16. INTEGRAÇÕES TÉCNICAS

### 16.1 Supabase (Lovable Cloud)
- [x] Autenticação completa
- [x] Banco de dados PostgreSQL com 15+ tabelas
- [x] RLS em todas as tabelas
- [x] Realtime para alertas
- [x] Storage para fotos de pessoas
- [x] Edge Functions (detect-faces, compare-faces)
- [x] Enums tipados: alert_type, camera_status, condition_operator, condition_type, rule_action, rule_category, rule_severity

### 16.2 Análise por IA
- [x] `AIAnalysisPanel` para análise de imagens
- [x] Integração com face-api.js para reconhecimento facial no browser
- [x] Edge functions para processamento backend

### 16.3 Testes
- [x] Configuração Cypress (E2E)
- [x] Configuração Playwright (E2E multi-browser)
- [x] Testes para: login, dashboard, câmeras, alertas, logout

---

## 17. PÁGINAS DO SISTEMA

| Rota | Página | Status |
|------|--------|--------|
| `/` | Index (Dashboard legado) | ✅ |
| `/auth` | Login/Registro | ✅ |
| `/auth/callback` | Callback de autenticação | ✅ |
| `/reset-password` | Redefinição de senha | ✅ |
| `/dashboard` | Dashboard V2 | ✅ |
| `/cameras` | Gerenciamento de Câmeras | ✅ |
| `/alerts` | Sistema de Alertas | ✅ |
| `/zones` | Zonas de Monitoramento | ✅ |
| `/recordings` | Gravações de Vídeo | ✅ |
| `/analytics` | Analytics | ✅ |
| `/settings` | Configurações | ✅ |
| `/security` | Segurança | ✅ |
| `/face-recognition` | Reconhecimento Facial | ✅ |
| `/license-plate` | ALPR (Placas) | ✅ |
| `/heatmap` | Mapa de Calor | ✅ |
| `/reports` | Relatórios | ✅ |
| `/ppe` | Detecção de EPI | ✅ |
| `/people` | Cadastro de Pessoas | ✅ |
| `/recognition-logs` | Logs de Reconhecimento | ✅ |
| `/recognition-analytics` | Analytics de Reconhecimento | ✅ |
| `/stream-settings` | Configuração de Streams | ✅ |
| `/telegram-settings` | Configuração Telegram | ✅ |
| `/notification-settings` | Configuração de Notificações | ✅ |
| `/automation-rules` | Regras de Automação | ✅ |
| `/profile` | Perfil do Usuário | ✅ |
| `/help` | Ajuda | ✅ |
| `/acesso-negado` | Acesso Negado | ✅ |
| `*` | 404 Not Found | ✅ |

---

## 18. LIMITAÇÕES CONHECIDAS

| Item | Motivo |
|------|--------|
| GitHub OAuth | Limitação da plataforma Lovable Cloud |
| 2FA (Autenticação de dois fatores) | Limitação da plataforma Lovable Cloud |

---

## 19. TABELAS DO BANCO DE DADOS

| Tabela | Descrição |
|--------|-----------|
| `alerts` | Alertas do sistema |
| `analysis_history` | Histórico de análises por IA |
| `cameras` | Câmeras cadastradas |
| `face_recognition_configs` | Configurações de reconhecimento facial |
| `notification_configs` | Configurações de notificação |
| `plate_detections` | Detecções de placas |
| `profiles` | Perfis de usuários |
| `recognition_logs` | Logs de reconhecimento facial |
| `registered_persons` | Pessoas cadastradas |
| `registered_plates` | Placas cadastradas |
| `rule_executions` | Execuções de regras |
| `rules` | Regras de automação |
| `video_clips` | Clips de vídeo |
| `zone_events` | Eventos de zona |
| `zones` | Zonas de monitoramento |

---

> **Status geral: ~95-100% do escopo viável implementado.**
