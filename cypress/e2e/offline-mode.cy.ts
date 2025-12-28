/**
 * @fileoverview Teste E2E - Modo Offline
 * @description Testa funcionalidades offline do sistema VISÃO
 */

describe('Offline Mode E2E', () => {
  beforeEach(() => {
    cy.login('admin@visao.com', 'senha123');
    cy.visit('/dashboard');
  });

  describe('Detecção de Conexão', () => {
    it('deve detectar perda de conexão', () => {
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(false);
        win.dispatchEvent(new Event('offline'));
      });
      cy.get('[data-testid="offline-indicator"]').should('be.visible');
    });

    it('deve detectar reconexão', () => {
      cy.window().then((win) => {
        win.dispatchEvent(new Event('online'));
      });
      cy.get('[data-testid="online-indicator"]').should('be.visible');
    });
  });

  describe('Cache de Dados', () => {
    it('deve exibir dados em cache quando offline', () => {
      cy.intercept('GET', '/api/cameras', { forceNetworkError: true });
      cy.reload();
      cy.get('[data-testid="camera-card"]').should('have.length.at.least', 1);
      cy.get('[data-testid="cached-data-indicator"]').should('be.visible');
    });

    it('deve manter alertas em cache', () => {
      cy.visit('/alerts');
      cy.intercept('GET', '/api/alerts', { forceNetworkError: true });
      cy.reload();
      cy.get('[data-testid="alert-card"]').should('exist');
    });
  });

  describe('Fila de Sincronização', () => {
    it('deve enfileirar ações offline', () => {
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(false);
      });
      cy.get('[data-testid="add-note"]').click();
      cy.get('[data-testid="note-input"]').type('Nota offline');
      cy.get('[data-testid="save-note"]').click();
      cy.get('[data-testid="queued-indicator"]').should('be.visible');
    });

    it('deve sincronizar ao reconectar', () => {
      cy.window().then((win) => {
        win.dispatchEvent(new Event('online'));
      });
      cy.get('[data-testid="syncing-indicator"]').should('be.visible');
      cy.get('[data-testid="sync-complete"]').should('be.visible');
    });
  });

  describe('Service Worker', () => {
    it('deve ter Service Worker registrado', () => {
      cy.window().then((win) => {
        expect(win.navigator.serviceWorker.controller).to.not.be.null;
      });
    });

    it('deve exibir prompt de atualização', () => {
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('swUpdate'));
      });
      cy.get('[data-testid="update-banner"]').should('be.visible');
    });
  });

  describe('PWA Install', () => {
    it('deve exibir banner de instalação', () => {
      cy.window().then((win) => {
        win.dispatchEvent(new Event('beforeinstallprompt'));
      });
      cy.get('[data-testid="install-banner"]').should('be.visible');
    });
  });
});
