# 🧠 Face-API.js Models

## ✅ Configuração Atual: CDN (Recomendado)

O VISÃO está configurado para usar modelos via **CDN jsdelivr**, eliminando a necessidade de hospedar arquivos localmente.

**URL CDN:** `https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights`

### Vantagens do CDN:
- ✅ Zero configuração local
- ✅ Cache automático no navegador
- ✅ CDN global (baixa latência)
- ✅ Sempre atualizado
- ✅ Reduz tamanho do deploy

---

## 📦 Modelos Carregados

| Modelo | Descrição | Tamanho |
|--------|-----------|---------|
| ssdMobilenetv1 | Detector de faces principal | 5.4 MB |
| tinyFaceDetector | Detector rápido (real-time) | 190 KB |
| faceLandmark68Net | 68 pontos de referência | 350 KB |
| faceRecognitionNet | Face descriptors (128D) | 6.2 MB |
| faceExpressionNet | Expressões (7 classes) | 310 KB |
| ageGenderNet | Idade e gênero | 420 KB |

**Total aproximado:** ~13 MB (cacheado após primeiro acesso)

---

## 🔧 Uso Offline (Opcional)

Para ambientes sem internet, baixe os modelos localmente:

```bash
# Clonar repositório de pesos
git clone https://github.com/justadudewhohacks/face-api.js.git
cp -r face-api.js/weights/* ./public/models/

# Alterar configuração em src/config/models_config.ts
# Mudar source: 'cdn' para source: 'local'
```

### Arquivos necessários:
```
public/models/
├── ssd_mobilenetv1_model-weights_manifest.json
├── ssd_mobilenetv1_model-shard1
├── ssd_mobilenetv1_model-shard2
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
├── face_recognition_model-shard2
├── face_expression_model-weights_manifest.json
├── face_expression_model-shard1
├── age_gender_model-weights_manifest.json
└── age_gender_model-shard1
```

---

## 📊 Performance

- **Primeira carga:** 5-10 segundos (download CDN)
- **Cargas seguintes:** <1 segundo (cache local)
- **Detecção por frame:** 50-100ms (SSD) / 10-30ms (Tiny)

---

*Configurado automaticamente pelo VISÃO*
