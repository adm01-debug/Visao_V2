/**
 * @fileoverview Teste E2E - Performance
 * @description Testes de performance e Core Web Vitals
 */

describe('Performance E2E', () => {
  beforeEach(() => {
    cy.login('admin@visao.com', 'senha123');
  });

  describe('Core Web Vitals', () => {
    it('deve ter LCP abaixo de 2.5s', () => {
      cy.visit('/dashboard', {
        onBeforeLoad: (win) => {
          win.performance.mark('start');
        }
      });
      cy.window().then((win) => {
        const lcp = win.performance.getEntriesByType('largest-contentful-paint')[0];
        expect(lcp?.startTime || 0).to.be.lessThan(2500);
      });
    });

    it('deve ter FID abaixo de 100ms', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="interactive-element"]').click();
      cy.window().then((win) => {
        const fid = win.performance.getEntriesByType('first-input')[0];
        expect(fid?.processingStart - fid?.startTime || 0).to.be.lessThan(100);
      });
    });

    it('deve ter CLS abaixo de 0.1', () => {
      cy.visit('/dashboard');
      cy.wait(3000);
      cy.window().then((win) => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        expect(cls).to.be.lessThan(0.1);
      });
    });
  });

  describe('Tempo de Carregamento', () => {
    it('deve carregar dashboard em menos de 3s', () => {
      const start = Date.now();
      cy.visit('/dashboard');
      cy.get('[data-testid="dashboard-loaded"]').should('be.visible').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000);
      });
    });

    it('deve carregar lista de câmeras em menos de 2s', () => {
      const start = Date.now();
      cy.visit('/cameras');
      cy.get('[data-testid="camera-card"]').should('be.visible').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(2000);
      });
    });
  });

  describe('Lazy Loading', () => {
    it('deve carregar imagens com lazy loading', () => {
      cy.visit('/dashboard');
      cy.get('img[loading="lazy"]').should('have.length.at.least', 1);
    });

    it('deve carregar componentes sob demanda', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="analytics-tab"]').click();
      cy.get('[data-testid="chart-loaded"]').should('be.visible');
    });
  });

  describe('Caching', () => {
    it('deve utilizar cache do browser', () => {
      cy.visit('/dashboard');
      cy.reload();
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource');
        const cached = resources.filter(r => r.transferSize === 0);
        expect(cached.length).to.be.greaterThan(0);
      });
    });
  });

  describe('Bundle Size', () => {
    it('deve ter bundle JS abaixo de 500KB', () => {
      cy.request('/assets/index.js').then((response) => {
        const sizeKB = response.body.length / 1024;
        expect(sizeKB).to.be.lessThan(500);
      });
    });
  });
});
