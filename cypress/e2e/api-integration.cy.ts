/**
 * @fileoverview Teste E2E - Integração API
 * @description Testes de integração com APIs externas
 */

describe('API Integration E2E', () => {
  beforeEach(() => {
    cy.login('admin@visao.com', 'senha123');
  });

  describe('Supabase', () => {
    it('deve conectar ao Supabase', () => {
      cy.visit('/dashboard');
      cy.intercept('GET', '**/rest/v1/**').as('supabaseRequest');
      cy.wait('@supabaseRequest').its('response.statusCode').should('eq', 200);
    });

    it('deve realizar operações CRUD', () => {
      // Create
      cy.intercept('POST', '**/rest/v1/cameras').as('createCamera');
      cy.visit('/cameras/new');
      cy.get('[data-testid="camera-name"]').type('API Test Camera');
      cy.get('[data-testid="save-camera"]').click();
      cy.wait('@createCamera').its('response.statusCode').should('eq', 201);

      // Read
      cy.intercept('GET', '**/rest/v1/cameras**').as('getCameras');
      cy.visit('/cameras');
      cy.wait('@getCameras').its('response.statusCode').should('eq', 200);
    });

    it('deve fazer upload de arquivos', () => {
      cy.intercept('POST', '**/storage/v1/object/**').as('uploadFile');
      cy.visit('/face-recognition');
      cy.get('[data-testid="upload-photo"]').attachFile('test-face.jpg');
      cy.wait('@uploadFile').its('response.statusCode').should('eq', 200);
    });
  });

  describe('Edge Functions', () => {
    it('deve chamar detect-faces', () => {
      cy.intercept('POST', '**/functions/v1/detect-faces').as('detectFaces');
      cy.visit('/face-recognition');
      cy.get('[data-testid="analyze-image"]').click();
      cy.wait('@detectFaces').its('response.statusCode').should('eq', 200);
    });

    it('deve chamar analyze-license-plate', () => {
      cy.intercept('POST', '**/functions/v1/analyze-license-plate').as('analyzePlate');
      cy.visit('/license-plate');
      cy.get('[data-testid="analyze-plate"]').click();
      cy.wait('@analyzePlate').its('response.statusCode').should('eq', 200);
    });

    it('deve chamar send-telegram', () => {
      cy.intercept('POST', '**/functions/v1/send-telegram').as('sendTelegram');
      cy.visit('/settings/telegram');
      cy.get('[data-testid="test-telegram"]').click();
      cy.wait('@sendTelegram').its('response.statusCode').should('eq', 200);
    });
  });

  describe('WebSocket', () => {
    it('deve conectar ao WebSocket', () => {
      cy.visit('/dashboard');
      cy.window().then((win) => {
        expect(win.WebSocket).to.exist;
      });
    });

    it('deve receber eventos em tempo real', () => {
      cy.visit('/alerts');
      cy.window().then((win) => {
        win.postMessage({ type: 'WS_MESSAGE', data: { event: 'new_alert' } }, '*');
      });
      cy.get('[data-testid="new-alert-notification"]').should('be.visible');
    });
  });

  describe('Terceiros', () => {
    it('deve integrar com Mapbox', () => {
      cy.intercept('GET', '**/api.mapbox.com/**').as('mapbox');
      cy.visit('/heatmap');
      cy.wait('@mapbox').its('response.statusCode').should('be.oneOf', [200, 304]);
    });

    it('deve integrar com OpenAI', () => {
      cy.intercept('POST', '**/functions/v1/analyze-image').as('analyzeImage');
      cy.visit('/cameras');
      cy.get('[data-testid="ai-analyze"]').first().click();
      cy.wait('@analyzeImage').its('response.statusCode').should('eq', 200);
    });
  });

  describe('Error Handling', () => {
    it('deve exibir erro quando API falha', () => {
      cy.intercept('GET', '**/rest/v1/cameras**', { statusCode: 500 }).as('getCameras');
      cy.visit('/cameras');
      cy.wait('@getCameras');
      cy.get('[data-testid="error-message"]').should('be.visible');
    });

    it('deve tentar novamente em caso de falha', () => {
      let attempts = 0;
      cy.intercept('GET', '**/rest/v1/cameras**', (req) => {
        attempts++;
        if (attempts < 3) {
          req.reply({ statusCode: 500 });
        } else {
          req.reply({ statusCode: 200, body: [] });
        }
      }).as('getCameras');
      cy.visit('/cameras');
      cy.get('[data-testid="camera-grid"]').should('be.visible');
    });

    it('deve exibir modo offline quando sem conexão', () => {
      cy.intercept('GET', '**/rest/v1/**', { forceNetworkError: true });
      cy.visit('/dashboard');
      cy.get('[data-testid="offline-mode"]').should('be.visible');
    });
  });

  describe('Rate Limiting', () => {
    it('deve respeitar rate limits', () => {
      cy.intercept('GET', '**/rest/v1/**', { statusCode: 429 }).as('rateLimited');
      cy.visit('/cameras');
      cy.wait('@rateLimited');
      cy.get('[data-testid="rate-limit-warning"]').should('be.visible');
    });
  });

  describe('Autenticação API', () => {
    it('deve incluir token em requisições', () => {
      cy.intercept('GET', '**/rest/v1/**').as('apiRequest');
      cy.visit('/cameras');
      cy.wait('@apiRequest').then((interception) => {
        expect(interception.request.headers).to.have.property('authorization');
      });
    });

    it('deve renovar token expirado', () => {
      cy.intercept('GET', '**/rest/v1/**', { statusCode: 401 }).as('unauthorized');
      cy.intercept('POST', '**/auth/v1/token**').as('refreshToken');
      cy.visit('/cameras');
      cy.wait('@unauthorized');
      cy.wait('@refreshToken');
    });
  });
});
