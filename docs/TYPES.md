# Types Guide - VISÃO

## Arquivos de Tipos

| Arquivo | Descrição |
|---------|-----------|
| `types/index.ts` | Barrel export |
| `types/surveillance.ts` | Câmeras, alertas |
| `types/faceRecognition.ts` | Face detection/recognition |
| `types/zones.ts` | Zonas de monitoramento |
| `types/clips.ts` | Gravações e clipes |
| `types/rules.ts` | Regras de automação |
| `types/streaming.ts` | Streaming de vídeo |

## Tipos Principais

```typescript
// Câmera
interface Camera {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline';
}

// Alerta
interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

// Pessoa
interface Person {
  id: string;
  name: string;
  faceEncoding: number[];
}
```

## Convenções
- Interfaces para objetos
- Types para unions/intersections
- Enums para valores fixos
- Generics quando apropriado
