# 🤖 Modelos de Machine Learning

Esta pasta é reservada para modelos ML caso você queira hospedar localmente.

## ✅ Configuração Atual: CDN

O VISÃO está configurado para carregar modelos automaticamente do CDN:

```
https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights
```

**Não é necessário baixar modelos manualmente** - eles são carregados automaticamente.

## 📦 Modelos Utilizados

### face-api.js (Carregados via CDN)
| Modelo | Função | Tamanho Aprox. |
|--------|--------|----------------|
| ssd_mobilenetv1 | Detecção de rostos | ~5.4 MB |
| tiny_face_detector | Detecção rápida | ~190 KB |
| face_landmark_68 | Pontos faciais | ~350 KB |
| face_recognition | Encoding 128D | ~6.2 MB |
| face_expression | Emoções | ~310 KB |
| age_gender | Idade/Gênero | ~420 KB |

### TensorFlow.js (Carregados via TF Hub)
| Modelo | Função |
|--------|--------|
| COCO-SSD | Detecção de objetos |
| MoveNet | Detecção de pose |

Estes modelos são carregados automaticamente pelo TensorFlow.js.

## 🔧 Hospedagem Local (Opcional)

Se preferir hospedar modelos localmente para melhor performance:

### 1. Baixar modelos face-api.js

```bash
cd public/models

# SSD MobileNet
curl -LO https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-weights_manifest.json
curl -LO https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-shard1
curl -LO https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-shard2

# Face Landmarks
curl -LO https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json
curl -LO https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1

# Face Recognition
curl -LO https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json
curl -LO https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard1
curl -LO https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard2
```

### 2. Atualizar configuração

Em `src/hooks/useFaceAPI.ts`, altere o `modelPath`:

```typescript
const defaultConfig: FaceAPIConfig = {
  modelPath: '/models', // Caminho local
  // ...
};
```

## 📊 Performance

| Método | Primeira Carga | Cache |
|--------|----------------|-------|
| CDN (jsdelivr) | ~2-5s | Cache browser |
| Local | ~1-3s | Cache browser |
| Service Worker | Instantâneo | SW cache |

## ⚡ Recomendações

1. **Desenvolvimento:** Use CDN (configuração atual)
2. **Produção:** CDN com Service Worker cache
3. **Offline:** Hospedar localmente

## 🔗 Links Úteis

- [face-api.js Weights](https://github.com/justadudewhohacks/face-api.js/tree/master/weights)
- [TensorFlow.js Models](https://www.tensorflow.org/js/models)
- [COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)

---

*Configuração atualizada em Dezembro 2025*
