/**
 * @fileoverview Teste E2E - Workflow Completo
 * @description Testa o fluxo completo do sistema VISÃO
 */

describe('Full Workflow E2E', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('GET', '/api/cameras').as('getCameras');
    cy.intercept('GET', '/api/alerts').as('getAlerts');
  });

  describe('Autenticação', () => {
    it('deve realizar login com credenciais válidas', () => {
      cy.get('[data-testid="email-input"]').type('admin@visao.com');
      cy.get('[data-testid="password-input"]').type('senha123');
      cy.get('[data-testid="login-button"]').click();
      cy.url().should('include', '/dashboard');
    });

    it('deve exibir erro com credenciais inválidas', () => {
      cy.get('[data-testid="email-input"]').type('invalido@test.com');
      cy.get('[data-testid="password-input"]').type('senhaerrada');
      cy.get('[data-testid="login-button"]').click();
      cy.get('[data-testid="error-message"]').should('be.visible');
    });
  });

  describe('Dashboard', () => {
    beforeEach(() => {
      cy.login('admin@visao.com', 'senha123');
    });

    it('deve carregar estatísticas', () => {
      cy.wait('@getCameras');
      cy.get('[data-testid="stats-card"]').should('have.length.at.least', 3);
    });

    it('deve exibir câmeras ativas', () => {
      cy.get('[data-testid="camera-grid"]').should('be.visible');
    });
  });

  describe('Gerenciamento de Câmeras', () => {
    beforeEach(() => {
      cy.login('admin@visao.com', 'senha123');
      cy.visit('/cameras');
    });

    it('deve listar todas as câmeras', () => {
      cy.wait('@getCameras');
      cy.get('[data-testid="camera-card"]').should('have.length.at.least', 1);
    });

    it('deve adicionar nova câmera', () => {
      cy.get('[data-testid="add-camera-button"]').click();
      cy.get('[data-testid="camera-name"]').type('Câmera Teste E2E');
      cy.get('[data-testid="camera-url"]').type('rtsp://test.stream/cam1');
      cy.get('[data-testid="save-camera"]').click();
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });
  });

  describe('Sistema de Alertas', () => {
    beforeEach(() => {
      cy.login('admin@visao.com', 'senha123');
      cy.visit('/alerts');
    });

    it('deve filtrar alertas por tipo', () => {
      cy.get('[data-testid="filter-type"]').select('face_detection');
      cy.wait('@getAlerts');
    });
  });

  describe('Logout', () => {
    it('deve realizar logout corretamente', () => {
      cy.login('admin@visao.com', 'senha123');
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();
      cy.url().should('include', '/auth');
    });
  });
});
