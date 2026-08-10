/**
 * @fileoverview Teste E2E - Alertas em Tempo Real
 * @description Testa sistema de alertas em tempo real via WebSocket
 */

describe('Real-Time Alerts E2E', () => {
  beforeEach(() => {
    cy.login('admin@visao.com', 'senha123');
    cy.visit('/alerts');
    cy.intercept('GET', '/api/alerts').as('getAlerts');
  });

  describe('Recebimento de Alertas', () => {
    it('deve receber alerta via WebSocket', () => {
      cy.window().then((win) => {
        win.postMessage({ type: 'NEW_ALERT', data: { id: 1, type: 'motion' } }, '*');
      });
      cy.get('[data-testid="alert-notification"]').should('be.visible');
    });

    it('deve tocar som de notificação', () => {
      cy.window().then((win) => {
        cy.stub(win.Audio.prototype, 'play').as('playSound');
      });
      cy.window().trigger('newAlert');
      cy.get('@playSound').should('have.been.called');
    });

    it('deve exibir badge de contagem', () => {
      cy.get('[data-testid="alert-badge"]').should('contain', '1');
    });
  });

  describe('Tipos de Alerta', () => {
    it('deve identificar alerta de detecção facial', () => {
      cy.get('[data-testid="alert-type-face"]').should('have.class', 'alert-warning');
    });

    it('deve identificar alerta de movimento', () => {
      cy.get('[data-testid="alert-type-motion"]').should('have.class', 'alert-info');
    });

    it('deve identificar alerta de pessoa na lista negra', () => {
      cy.get('[data-testid="alert-type-blacklist"]').should('have.class', 'alert-danger');
    });

    it('deve identificar alerta de placa de veículo', () => {
      cy.get('[data-testid="alert-type-plate"]').should('have.class', 'alert-success');
    });
  });

  describe('Ações em Alertas', () => {
    it('deve marcar como lido', () => {
      cy.get('[data-testid="alert-card"]').first().click();
      cy.get('[data-testid="mark-read"]').click();
      cy.get('[data-testid="alert-status"]').should('contain', 'Lido');
    });

    it('deve encaminhar para responsável', () => {
      cy.get('[data-testid="forward-alert"]').click();
      cy.get('[data-testid="select-user"]').select('supervisor');
      cy.get('[data-testid="send-forward"]').click();
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });

    it('deve adicionar nota', () => {
      cy.get('[data-testid="add-note"]').click();
      cy.get('[data-testid="note-input"]').type('Verificado às 14h');
      cy.get('[data-testid="save-note"]').click();
    });
  });

  describe('Filtros de Alerta', () => {
    it('deve filtrar por data', () => {
      cy.get('[data-testid="date-filter"]').click();
      cy.get('[data-testid="date-today"]').click();
      cy.wait('@getAlerts');
    });

    it('deve filtrar por câmera', () => {
      cy.get('[data-testid="camera-filter"]').select('camera-1');
      cy.wait('@getAlerts');
    });

    it('deve filtrar por severidade', () => {
      cy.get('[data-testid="severity-filter"]').select('high');
      cy.wait('@getAlerts');
    });
  });

  describe('Histórico', () => {
    it('deve carregar mais alertas ao scroll', () => {
      cy.get('[data-testid="alerts-list"]').scrollTo('bottom');
      cy.get('[data-testid="loading-more"]').should('be.visible');
    });

    it('deve exportar alertas', () => {
      cy.get('[data-testid="export-alerts"]').click();
      cy.get('[data-testid="export-csv"]').click();
    });
  });
});
