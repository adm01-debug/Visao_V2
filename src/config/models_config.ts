/**
 * VISÃO - Configuração de Modelos face-api.js
 * 
 * Por padrão, o sistema usa CDN (jsdelivr) para carregar os modelos.
 * Isso elimina a necessidade de hospedar modelos localmente.
 * 
 * Para usar modelos locais (offline):
 * 1. Baixe os modelos de: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
 * 2. Copie para: /public/models/
 * 3. Altere MODEL_SOURCE para 'local'
 */

export type ModelSource = 'cdn' | 'local';

export const MODEL_CONFIG = {
  // Fonte dos modelos: 'cdn' (recomendado) ou 'local'
  source: 'cdn' as ModelSource,
  
  // URLs das fontes
  urls: {
    cdn: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
    local: '/models'
  },
  
  // Modelos disponíveis
  models: {
    ssdMobilenetv1: {
      name: 'SSD MobileNet v1',
      description: 'Detector de faces principal (alta precisão)',
      size: '5.4 MB'
    },
    tinyFaceDetector: {
      name: 'Tiny Face Detector',
      description: 'Detector rápido para tempo real',
      size: '190 KB'
    },
    faceLandmark68Net: {
      name: 'Face Landmark 68',
      description: '68 pontos de referência facial',
      size: '350 KB'
    },
    faceRecognitionNet: {
      name: 'Face Recognition',
      description: 'Extração de face descriptors (128D)',
      size: '6.2 MB'
    },
    faceExpressionNet: {
      name: 'Face Expression',
      description: 'Detecção de expressões (7 classes)',
      size: '310 KB'
    },
    ageGenderNet: {
      name: 'Age Gender',
      description: 'Estimativa de idade e gênero',
      size: '420 KB'
    }
  }
};

export function getModelUrl(): string {
  return MODEL_CONFIG.urls[MODEL_CONFIG.source];
}

export function getTotalModelSize(): string {
  return '~13 MB';
}
