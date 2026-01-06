# 🔌 Plugins Guide - Projeto VISÃO

## Visão Geral

Sistema de plugins para estender funcionalidades do VISÃO.

---

## 1. Arquitetura

```
plugins/
├── core/           # Plugins oficiais
├── community/      # Plugins da comunidade
└── custom/         # Plugins customizados
```

---

## 2. Plugin Interface

```typescript
interface VisaoPlugin {
  name: string;
  version: string;
  description: string;
  author: string;
  
  // Lifecycle hooks
  onInit?: () => Promise<void>;
  onDestroy?: () => Promise<void>;
  
  // Event handlers
  onAlert?: (alert: Alert) => void;
  onRecognition?: (match: RecognitionMatch) => void;
  onZoneViolation?: (violation: ZoneViolation) => void;
  
  // UI components
  components?: {
    settings?: React.ComponentType;
    dashboard?: React.ComponentType;
  };
}
```

---

## 3. Plugins Oficiais

### 3.1 Telegram Notifications

```typescript
import { TelegramPlugin } from '@visao/plugin-telegram';

const telegram = new TelegramPlugin({
  botToken: 'YOUR_BOT_TOKEN',
  chatIds: ['123456789'],
  alertTypes: ['intrusion', 'blacklist'],
});
```

### 3.2 Email Alerts

```typescript
import { EmailPlugin } from '@visao/plugin-email';

const email = new EmailPlugin({
  provider: 'resend',
  apiKey: 'YOUR_API_KEY',
  from: 'alerts@visao.app',
  recipients: ['security@company.com'],
});
```

### 3.3 Webhook Integration

```typescript
import { WebhookPlugin } from '@visao/plugin-webhook';

const webhook = new WebhookPlugin({
  url: 'https://api.company.com/alerts',
  secret: 'webhook-secret',
  events: ['alert.created', 'recognition.match'],
});
```

### 3.4 AWS S3 Storage

```typescript
import { S3Plugin } from '@visao/plugin-s3';

const s3 = new S3Plugin({
  bucket: 'visao-recordings',
  region: 'us-east-1',
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
});
```

---

## 4. Criando um Plugin

### Estrutura

```
my-plugin/
├── src/
│   ├── index.ts
│   ├── components/
│   │   └── Settings.tsx
│   └── handlers/
│       └── alertHandler.ts
├── package.json
└── README.md
```

### Exemplo

```typescript
// src/index.ts
import { VisaoPlugin, Alert } from '@visao/sdk';

export class MyCustomPlugin implements VisaoPlugin {
  name = 'my-custom-plugin';
  version = '1.0.0';
  description = 'Plugin customizado';
  author = 'Seu Nome';

  async onInit() {
    console.log('Plugin inicializado');
  }

  onAlert(alert: Alert) {
    if (alert.severity === 'critical') {
      this.sendSlackMessage(alert);
    }
  }

  private async sendSlackMessage(alert: Alert) {
    // Implementação
  }
}
```

---

## 5. Registrar Plugin

```typescript
// main.tsx
import { VisaoApp } from '@visao/core';
import { MyCustomPlugin } from './plugins/my-custom-plugin';

const app = new VisaoApp({
  plugins: [
    new MyCustomPlugin(),
  ],
});

app.start();
```

---

## 6. Hooks Disponíveis

| Hook | Descrição | Payload |
|------|-----------|---------|
| `onInit` | Inicialização | - |
| `onDestroy` | Finalização | - |
| `onAlert` | Novo alerta | `Alert` |
| `onRecognition` | Match facial | `RecognitionMatch` |
| `onZoneViolation` | Violação de zona | `ZoneViolation` |
| `onCameraStatus` | Status da câmera | `CameraStatus` |
| `onRecordingStart` | Início de gravação | `Recording` |
| `onRecordingEnd` | Fim de gravação | `Recording` |

---

## 7. Plugin Settings UI

```tsx
// components/Settings.tsx
import { useState } from 'react';
import { Card, Input, Switch } from '@/components/ui';

export const PluginSettings = () => {
  const [enabled, setEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');

  return (
    <Card>
      <h3>My Plugin Settings</h3>
      <Switch
        checked={enabled}
        onCheckedChange={setEnabled}
        label="Enabled"
      />
      <Input
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="API Key"
        type="password"
      />
    </Card>
  );
};
```

---

## 8. Publicar Plugin

```bash
# Build
npm run build

# Publicar no npm
npm publish --access public
```

### package.json

```json
{
  "name": "@visao/plugin-my-custom",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@visao/sdk": "^1.0.0"
  }
}
```

---

## 9. Plugins da Comunidade

| Plugin | Descrição | Autor |
|--------|-----------|-------|
| `@visao/plugin-slack` | Notificações Slack | Community |
| `@visao/plugin-discord` | Notificações Discord | Community |
| `@visao/plugin-mqtt` | Integração MQTT | Community |
| `@visao/plugin-influxdb` | Métricas InfluxDB | Community |

---

**Última atualização:** 06/01/2026
