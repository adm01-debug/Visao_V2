/**
 * @fileoverview Teste E2E - Segurança
 * @description Testes de segurança e proteção
 */

describe('Security E2E', () => {
  describe('Autenticação', () => {
    it('deve redirecionar para login se não autenticado', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/auth');
    });

    it('deve expirar sessão após inatividade', () => {
      cy.login('admin@visao.com', 'senha123');
      cy.wait(3600000); // 1 hora simulada
      cy.visit('/dashboard');
      cy.url().should('include', '/auth');
    });

    it('deve bloquear após múltiplas tentativas falhas', () => {
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="email-input"]').clear().type('admin@visao.com');
        cy.get('[data-testid="password-input"]').clear().type('senhaerrada');
        cy.get('[data-testid="login-button"]').click();
      }
      cy.get('[data-testid="account-locked"]').should('be.visible');
    });

    it('deve exigir 2FA quando habilitado', () => {
      cy.login('admin@visao.com', 'senha123');
      cy.get('[data-testid="2fa-prompt"]').should('be.visible');
      cy.get('[data-testid="2fa-code"]').type('123456');
      cy.get('[data-testid="verify-2fa"]').click();
    });
  });

  describe('CSRF Protection', () => {
    it('deve ter token CSRF em formulários', () => {
      cy.login('admin@visao.com', 'senha123');
      cy.visit('/settings');
      cy.get('input[name="_csrf"]').should('exist');
    });

    it('deve rejeitar requisições sem token CSRF', () => {
      cy.request({
        method: 'POST',
        url: '/api/cameras',
        body: { name: 'Test' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
    });
  });

  describe('XSS Protection', () => {
    it('deve sanitizar input de usuário', () => {
      cy.login('admin@visao.com', 'senha123');
      cy.visit('/cameras/new');
      cy.get('[data-testid="camera-name"]').type('<script>alert("xss")</script>');
      cy.get('[data-testid="save-camera"]').click();
      cy.get('[data-testid="camera-name-display"]').should('not.contain', '<script>');
    });

    it('deve ter CSP headers', () => {
      cy.request('/dashboard').then((response) => {
        expect(response.headers).to.have.property('content-security-policy');
      });
    });
  });

  describe('Autorização', () => {
    it('deve bloquear acesso a recursos não autorizados', () => {
      cy.login('viewer@visao.com', 'senha123');
      cy.visit('/settings/admin');
      cy.get('[data-testid="access-denied"]').should('be.visible');
    });

    it('deve ocultar ações não permitidas', () => {
      cy.login('viewer@visao.com', 'senha123');
      cy.visit('/cameras');
      cy.get('[data-testid="delete-camera"]').should('not.exist');
    });
  });

  describe('Dados Sensíveis', () => {
    it('deve mascarar senhas', () => {
      cy.visit('/auth');
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });

    it('deve não expor tokens em URLs', () => {
      cy.login('admin@visao.com', 'senha123');
      cy.url().should('not.contain', 'token');
    });

    it('deve limpar dados ao logout', () => {
      cy.login('admin@visao.com', 'senha123');
      cy.get('[data-testid="logout-button"]').click();
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });
  });

  describe('Headers de Segurança', () => {
    it('deve ter X-Frame-Options', () => {
      cy.request('/').then((response) => {
        expect(response.headers['x-frame-options']).to.eq('DENY');
      });
    });

    it('deve ter X-Content-Type-Options', () => {
      cy.request('/').then((response) => {
        expect(response.headers['x-content-type-options']).to.eq('nosniff');
      });
    });

    it('deve ter Strict-Transport-Security', () => {
      cy.request('/').then((response) => {
        expect(response.headers['strict-transport-security']).to.exist;
      });
    });
  });
});
