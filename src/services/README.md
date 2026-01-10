# ⚙️ Serviços do VISÃO

## Estrutura

```
services/
├── index.ts          # Export central
├── __tests__/        # 39 testes
└── *Service.ts       # 35 serviços
```

## Serviços por Categoria

### 🔐 Autenticação
- `authService` - Login, registro, sessões
- `permissionService` - Controle de permissões

### 📹 Câmeras
- `camerasService` - CRUD de câmeras
- `streamingService` - Streaming de vídeo

### 🔔 Alertas
- `alertsService` - Gerenciamento de alertas
- `notificationService` - Notificações push
- `notificationsService` - Histórico de notificações

### 🤖 IA
- `aiService` - Integração com IA
- `mlService` - Machine Learning
- `ocrService` - OCR para placas

### 📊 Analytics
- `analyticsService` - Métricas e analytics
- `reportsService` - Geração de relatórios

### 💾 Storage
- `storageService` - Armazenamento de arquivos
- `cacheService` - Cache de dados

### 🔧 Utilitários
- `validationService` - Validações
- `encryptionService` - Criptografia
- `exportService` - Exportação de dados
- `importService` - Importação de dados
- `loggerService` - Logging

### 🌐 APIs Externas
- `geocodingService` - Geocodificação
- `weatherService` - Clima
- `calendarService` - Calendário
- `paymentService` - Pagamentos

### 🔄 Comunicação
- `websocketService` - WebSocket
- `queueService` - Fila de mensagens
- `rateLimitService` - Rate limiting
- `syncService` - Sincronização
- `searchService` - Busca

### 📄 Documentos
- `pdfService` - Geração de PDFs
- `excelService` - Planilhas Excel
- `translationService` - Traduções

### 🗺️ Zonas
- `zonesService` - Gerenciamento de zonas
- `recognitionService` - Reconhecimento

## Cobertura de Testes

**39 arquivos de teste** - Todos os serviços testados!

---

*Atualizado em 10/01/2026*

