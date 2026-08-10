# 💻 Exemplos de Código - VISÃO

Guia prático com exemplos de como utilizar as principais funcionalidades do sistema.

## 1. Autenticação e Supabase

### Usando o useAuth Hook

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, signOut } = useAuth();

  return (
    <div>
      <p>Bem-vindo, {user?.email}</p>
      <button onClick={() => signOut()}>Sair</button>
    </div>
  );
}
```

### Consultando Dados

```tsx
import { supabase } from '@/integrations/supabase/client';

async function fetchCameras() {
  const { data, error } = await supabase.from('cameras').select('*').eq('status', 'online');

  if (error) throw error;
  return data;
}
```

## 2. IA e Análise de Imagens

### Detectando Rostos

```tsx
import { useFaceDetection } from '@/hooks/useFaceDetection';

function Detector() {
  const { detect, isDetecting } = useFaceDetection();

  const handleCapture = async (blob: Blob) => {
    const result = await detect(blob);
    console.log('Rostos detectados:', result.faces);
  };

  return (
    <button onClick={handleCapture} disabled={isDetecting}>
      Detectar
    </button>
  );
}
```

## 3. Alertas e Notificações

### Criando um Alerta Manual

```tsx
import { useAlerts } from '@/hooks/useAlerts';

function ManualAlert() {
  const { createAlert } = useAlerts();

  const handleDanger = () => {
    createAlert({
      type: 'security',
      severity: 'high',
      message: 'Intrusão detectada no Perímetro Norte',
      cameraId: 'cam-123',
    });
  };

  return <button onClick={handleDanger}>Gerar Alerta Crítico</button>;
}
```

## 4. Utilitários

### Sanitização de Dados

```ts
import { sanitizeHtml, stripHtml } from '@/lib/sanitization';

const unsafeInput = '<script>alert("xss")</script>Olá Mundo';
const safeText = stripHtml(unsafeInput); // "Olá Mundo"
const safeHtml = sanitizeHtml(unsafeInput); // "&lt;script&gt;..."
```

### Circuit Breaker (Resiliência)

```ts
import { withCircuitBreaker } from '@/lib/resilience';

async function riskyOperation() {
  return await withCircuitBreaker('external-api', async () => {
    const res = await fetch('https://api.external.com/data');
    return res.json();
  });
}
```

## 5. Streaming (HLS)

### Player de Vídeo Básico

```tsx
import { HLSPlayer } from '@/components/HLSPlayer';

function LiveStream() {
  return <HLSPlayer url="https://stream.visao.app/hls/camera1.m3u8" autoPlay muted />;
}
```
