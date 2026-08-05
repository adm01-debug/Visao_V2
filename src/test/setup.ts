import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'isSecureContext', { value: true });

// O jsdom não expõe `crypto.subtle`. Até a Onda 156 isso era contornado com um
// digest falso (XOR sobre os 32 primeiros bytes) — suficiente para "algo em
// hexa" aparecer na tela, e catastrófico para qualquer teste de integridade:
// aquele stub colidia para entradas diferentes, de modo que uma corrente de
// custódia adulterada passaria no CI como íntegra. Usamos o Web Crypto real do
// Node: é a mesma implementação de SHA-256 que roda no navegador e na borda.
import { webcrypto } from 'node:crypto';

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
  writable: true,
});
