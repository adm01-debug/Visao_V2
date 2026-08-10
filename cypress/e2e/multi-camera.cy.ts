/**
 * @fileoverview Teste E2E - Múltiplas Câmeras
 * @description Testa operações com múltiplas câmeras simultaneamente
 */

describe('Multi-Camera E2E', () => {
  beforeEach(() => {
    cy.login('admin@visao.com', 'senha123');
    cy.visit('/cameras');
    cy.intercept('GET', '/api/cameras').as('getCameras');
    cy.intercept('GET', '/api/streams/*').as('getStream');
  });

  describe('Grid de Câmeras', () => {
    it('deve exibir grid 2x2', () => {
      cy.get('[data-testid="grid-2x2"]').click();
      cy.get('[data-testid="camera-viewport"]').should('have.length', 4);
    });

    it('deve exibir grid 3x3', () => {
      cy.get('[data-testid="grid-3x3"]').click();
      cy.get('[data-testid="camera-viewport"]').should('have.length', 9);
    });

    it('deve exibir grid 4x4', () => {
      cy.get('[data-testid="grid-4x4"]').click();
      cy.get('[data-testid="camera-viewport"]').should('have.length', 16);
    });
  });

  describe('Streaming Simultâneo', () => {
    it('deve carregar múltiplos streams', () => {
      cy.wait('@getCameras');
      cy.get('[data-testid="camera-stream"]').each(($el) => {
        cy.wrap($el).should('have.attr', 'src');
      });
    });

    it('deve pausar stream individual', () => {
      cy.get('[data-testid="camera-stream"]').first().trigger('mouseover');
      cy.get('[data-testid="pause-stream"]').click();
      cy.get('[data-testid="stream-status"]').should('contain', 'Pausado');
    });

    it('deve alternar para tela cheia', () => {
      cy.get('[data-testid="camera-stream"]').first().dblclick();
      cy.get('[data-testid="fullscreen-mode"]').should('be.visible');
    });
  });

  describe('Controles de Câmera', () => {
    it('deve ajustar PTZ', () => {
      cy.get('[data-testid="camera-card"]').first().click();
      cy.get('[data-testid="ptz-controls"]').should('be.visible');
      cy.get('[data-testid="ptz-up"]').click();
      cy.get('[data-testid="ptz-left"]').click();
    });

    it('deve fazer zoom', () => {
      cy.get('[data-testid="camera-card"]').first().click();
      cy.get('[data-testid="zoom-in"]').click();
      cy.get('[data-testid="zoom-level"]').should('contain', '2x');
    });
  });

  describe('Gravação', () => {
    it('deve iniciar gravação manual', () => {
      cy.get('[data-testid="camera-card"]').first().click();
      cy.get('[data-testid="start-recording"]').click();
      cy.get('[data-testid="recording-indicator"]').should('be.visible');
    });

    it('deve parar gravação', () => {
      cy.get('[data-testid="stop-recording"]').click();
      cy.get('[data-testid="recording-saved"]').should('be.visible');
    });
  });

  describe('Snapshot', () => {
    it('deve capturar snapshot', () => {
      cy.get('[data-testid="camera-card"]').first().click();
      cy.get('[data-testid="take-snapshot"]').click();
      cy.get('[data-testid="snapshot-preview"]').should('be.visible');
    });

    it('deve salvar snapshot', () => {
      cy.get('[data-testid="save-snapshot"]').click();
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });
  });
});
