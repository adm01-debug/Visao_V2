# 🪝 Referência de Hooks

## Hooks de Câmera

### useCamera
```typescript
const { cameras, loading, error, addCamera, removeCamera } = useCamera();
```

### useVideoStream
```typescript
const { stream, isPlaying, play, pause, snapshot } = useVideoStream(cameraId);
```

### usePTZ
```typescript
const { pan, tilt, zoom, moveToPreset } = usePTZ(cameraId);
```

## Hooks de IA/ML

### useFaceAPI
```typescript
const { detect, recognize, loading } = useFaceAPI();
```

### usePPEDetection
```typescript
const { detect, results } = usePPEDetection(streamRef);
```

### useMLModels
```typescript
const { loadModel, predict, isLoaded } = useMLModels();
```

## Hooks de Alertas

### useAlerts
```typescript
const { alerts, acknowledge, dismiss, filter } = useAlerts();
```

### useNotifications
```typescript
const { send, requestPermission, hasPermission } = useNotifications();
```

## Hooks de Zonas

### useZones
```typescript
const { zones, createZone, updateZone, deleteZone } = useZones();
```

### useHeatmap
```typescript
const { data, generate, clear } = useHeatmap(zoneId);
```

## Hooks Utilitários

### useLocalStorage
```typescript
const [value, setValue] = useLocalStorage('key', defaultValue);
```

### useDebounce
```typescript
const debouncedValue = useDebounce(value, 300);
```

### useMediaQuery
```typescript
const isMobile = useMediaQuery('(max-width: 768px)');
```

## Hooks de Form

### useForm
```typescript
const { register, handleSubmit, errors } = useForm(schema);
```

### useFieldArray
```typescript
const { fields, append, remove } = useFieldArray('items');
```
