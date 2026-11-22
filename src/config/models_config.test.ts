import { describe, expect, it } from 'vitest';
import { MODEL_CONFIG, getModelUrl } from './models_config';

describe('models_config', () => {
  it('usa CDN por padrão (fonte "cdn")', () => {
    expect(MODEL_CONFIG.source).toBe('cdn');
  });

  it('getModelUrl retorna a URL da fonte ativa', () => {
    expect(getModelUrl()).toBe(MODEL_CONFIG.urls[MODEL_CONFIG.source]);
  });

  it('URL da CDN aponta para o diretório de pesos do repositório (não do pacote npm)', () => {
    const url = MODEL_CONFIG.urls.cdn;
    // O pacote npm de face-api.js não contém weights/; o diretório de pesos
    // do repositório fixado em 0.22.2 é servido em /gh/... no jsdelivr.
    expect(url).toBe('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights');
  });
});
