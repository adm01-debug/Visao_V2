# 🤖 Modelos de Machine Learning

Esta pasta contém os modelos necessários para detecção facial e de objetos.

## 📦 Modelos Necessários

### face-api.js
Download de: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Arquivos necessários:
- `ssd_mobilenetv1_model-weights_manifest.json`
- `ssd_mobilenetv1_model-shard1`
- `ssd_mobilenetv1_model-shard2`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_expression_model-weights_manifest.json`
- `face_expression_model-shard1`
- `age_gender_model-weights_manifest.json`
- `age_gender_model-shard1`

### TensorFlow.js (COCO-SSD e MoveNet)
Estes modelos são baixados automaticamente do TensorFlow Hub quando necessário.

## 🚀 Download Rápido

```bash
# Clonar modelos do face-api.js
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-weights_manifest.json -o ssd_mobilenetv1_model-weights_manifest.json
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-shard1 -o ssd_mobilenetv1_model-shard1
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-shard2 -o ssd_mobilenetv1_model-shard2
# ... continuar para outros modelos
```

## 🔗 Alternativa: Usar CDN

Se preferir não hospedar os modelos localmente, configure o `modelPath` nos hooks:

```typescript
// useFaceAPI.ts
const config = {
  modelPath: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
  // ...
};
```

## ⚠️ Nota Importante

Os modelos são grandes (~6MB cada). Considere:
1. Usar CDN em produção
2. Habilitar cache no servidor
3. Lazy loading dos modelos

## 📊 Tamanhos Aproximados

| Modelo | Tamanho |
|--------|---------|
| ssd_mobilenetv1 | ~5.4 MB |
| face_landmark_68 | ~350 KB |
| face_recognition | ~6.2 MB |
| tiny_face_detector | ~190 KB |
| face_expression | ~310 KB |
| age_gender | ~420 KB |
