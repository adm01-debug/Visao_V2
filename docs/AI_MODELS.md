# 🤖 AI Models - Projeto VISÃO

## Visão Geral

O sistema VISÃO utiliza diversos modelos de IA para processamento de vídeo em tempo real.

---

## 1. Face-api.js

### Descrição
Biblioteca JavaScript para detecção e reconhecimento facial no navegador.

### Modelos Utilizados

| Modelo | Descrição | Tamanho |
|--------|-----------|---------|
| `ssdMobilenetv1` | Detecção de faces | ~5.4 MB |
| `faceLandmark68Net` | 68 pontos faciais | ~350 KB |
| `faceRecognitionNet` | Encoding facial 128D | ~6.2 MB |
| `faceExpressionNet` | 7 expressões | ~310 KB |
| `ageGenderNet` | Idade e gênero | ~420 KB |

### Configuração

```typescript
import * as faceapi from 'face-api.js';

// Carregar modelos
await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
```

### Performance

| Métrica | Valor |
|---------|-------|
| Detecção | ~50-100ms |
| Landmarks | ~20-40ms |
| Encoding | ~150-200ms |

---

## 2. Detecção de EPIs (PPE)

### Descrição
Modelo customizado para detecção de Equipamentos de Proteção Individual.

### Classes Detectadas

| Classe | Código | Cor |
|--------|--------|-----|
| Capacete | `helmet` | 🟢 Verde |
| Colete | `vest` | 🟡 Amarelo |
| Óculos | `glasses` | 🔵 Azul |
| Máscara | `mask` | 🟣 Roxo |
| Luvas | `gloves` | 🟠 Laranja |

### Configuração

```typescript
interface PPEConfig {
  requiredItems: ('helmet' | 'vest' | 'glasses' | 'mask' | 'gloves')[];
  confidence: number; // 0.0 - 1.0
  alertOnMissing: boolean;
}
```

---

## 3. Detecção de Placas (ALPR)

### Descrição
Reconhecimento automático de placas veiculares.

### Suporte

- Placas brasileiras (Mercosul e antigas)
- OCR com Tesseract.js
- Validação de formato

### Pipeline

1. Detecção da região da placa
2. Correção de perspectiva
3. Binarização e pré-processamento
4. OCR com Tesseract
5. Validação de padrão

---

## 4. Análise de Zonas

### Tipos de Zona

| Tipo | Descrição |
|------|-----------|
| `restricted` | Área restrita - alerta ao entrar |
| `counting` | Contagem de pessoas |
| `tripwire` | Linha virtual - detecta cruzamento |
| `dwell` | Tempo de permanência |

### Algoritmos

- **Detecção de entrada/saída**: Ray casting
- **Contagem**: Centroid tracking
- **Permanência**: Timestamp delta

---

## 5. Heatmap

### Descrição
Mapa de calor baseado em movimentação.

### Configuração

```typescript
interface HeatmapConfig {
  resolution: number; // pixels
  decay: number; // 0.0 - 1.0
  colorScale: 'jet' | 'hot' | 'cool';
  maxIntensity: number;
}
```

---

## Requisitos de Hardware

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| CPU | i5 8ª gen | i7 10ª gen |
| RAM | 8 GB | 16 GB |
| GPU | Integrada | GTX 1060+ |
| WebGL | 2.0 | 2.0 |

---

## Edge Functions (Supabase)

| Função | Descrição |
|--------|-----------|
| `analyze-image` | Análise geral de imagem |
| `detect-faces` | Detecção facial |
| `compare-faces` | Comparação 1:1 |
| `generate-face-encoding` | Gerar encoding |
| `analyze-license-plate` | OCR de placas |

---

**Última atualização:** 06/01/2026
