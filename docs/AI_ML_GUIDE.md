# 🤖 Guia de IA/ML

## Modelos Disponíveis

### Detecção Facial (face-api.js)

```typescript
import { useFaceAPI } from '@/hooks/useFaceAPI';

const { detect, recognize } = useFaceAPI();

// Detectar faces
const faces = await detect(imageElement);

// Reconhecer pessoa
const person = await recognize(faceDescriptor);
```

### Detecção de EPIs (TensorFlow.js)

```typescript
import { usePPEDetection } from '@/hooks/usePPEDetection';

const { detect } = usePPEDetection();

// Detectar equipamentos
const equipment = await detect(frame);
// Returns: { helmet: true, vest: false, gloves: true }
```

### Análise de Imagem (Google Vision)

Via Edge Function:

```typescript
const response = await supabase.functions.invoke('analyze-image', {
  body: { imageUrl: 'https://...' }
});
```

## Fluxo de Análise

1. Captura de frame do stream
2. Envio para modelo de detecção
3. Processamento de resultados
4. Avaliação de regras
5. Geração de alertas

## Configuração de Modelos

### face-api.js

```typescript
// Carregar modelos
await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
```

### TensorFlow.js

```typescript
// Carregar modelo customizado
const model = await tf.loadLayersModel('/models/ppe/model.json');
```

## Performance

| Modelo | FPS | Precisão |
|--------|-----|----------|
| Face Detection | 15-30 | 95% |
| PPE Detection | 10-20 | 90% |
| License Plate | 5-10 | 85% |

## Otimizações

- Web Workers para processamento
- Canvas offscreen
- Batch processing
- Model caching

## Treinamento Customizado

Para treinar modelos customizados, use:
- TensorFlow/Keras
- Export para TensorFlow.js format
- Deploy em `/public/models/`
