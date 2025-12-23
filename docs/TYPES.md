# 🏷️ Sistema de Tipos - VISÃO

## Estrutura

```
src/types/
├── index.ts           # Re-exports
├── clips.ts           # Tipos de clips
├── continuousAnalysis.ts
├── extended.ts
├── faceRecognition.ts
├── rules.ts
├── streaming.ts
├── surveillance.ts
└── zones.ts
```

## Tipos Principais

### Camera
```typescript
interface Camera {
  id: string;
  name: string;
  stream_url: string;
  status: "online" | "offline";
}
```

### Alert
```typescript
interface Alert {
  id: string;
  type: AlertType;
  severity: "low" | "medium" | "high" | "critical";
  camera_id: string;
  timestamp: string;
}
```

### Zone
```typescript
interface Zone {
  id: string;
  name: string;
  points: Point[];
  type: ZoneType;
}
```

## Boas Práticas

- Usar `unknown` ao invés de `any`
- Exportar tipos no index.ts
- Documentar com JSDoc

