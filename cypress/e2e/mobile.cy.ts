/**
 * @fileoverview Teste E2E - Mobile
 * @description Testes de responsividade e funcionalidades mobile
 */

describe('Mobile E2E', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Samsung Galaxy', width: 360, height: 740 },
    { name: 'iPad Mini', width: 768, height: 1024 }
  ];

  viewports.forEach((viewport) => {
    describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height);
        cy.login('admin@visao.com', 'senha123');
      });

      describe('Layout Responsivo', () => {
        it('deve exibir menu hamburguer', () => {
          cy.visit('/dashboard');
          cy.get('[data-testid="hamburger-menu"]').should('be.visible');
          cy.get('[data-testid="sidebar"]').should('not.be.visible');
        });

        it('deve abrir menu ao clicar', () => {
          cy.visit('/dashboard');
          cy.get('[data-testid="hamburger-menu"]').click();
          cy.get('[data-testid="mobile-menu"]').should('be.visible');
        });

        it('deve exibir cards em coluna única', () => {
          cy.visit('/dashboard');
          cy.get('[data-testid="stats-grid"]').should('have.css', 'flex-direction', 'column');
        });
      });

      describe('Touch Gestures', () => {
        it('deve suportar swipe para fechar menu', () => {
          cy.visit('/dashboard');
          cy.get('[data-testid="hamburger-menu"]').click();
          cy.get('[data-testid="mobile-menu"]').swipe('left');
          cy.get('[data-testid="mobile-menu"]').should('not.be.visible');
        });

        it('deve suportar pull-to-refresh', () => {
          cy.visit('/dashboard');
          cy.get('[data-testid="main-content"]').swipe('down', { distance: 150 });
          cy.get('[data-testid="refresh-indicator"]').should('be.visible');
        });
      });

      describe('Câmeras Mobile', () => {
        it('deve exibir grid 1x1 em mobile', () => {
          cy.visit('/cameras');
          if (viewport.width < 768) {
            cy.get('[data-testid="camera-grid"]').should('have.class', 'grid-cols-1');
          }
        });

        it('deve abrir câmera em tela cheia', () => {
          cy.visit('/cameras');
          cy.get('[data-testid="camera-card"]').first().click();
          cy.get('[data-testid="fullscreen-view"]').should('be.visible');
        });
      });

      describe('Formulários Mobile', () => {
        it('deve exibir teclado numérico para campos numéricos', () => {
          cy.visit('/settings');
          cy.get('[data-testid="port-input"]').should('have.attr', 'inputmode', 'numeric');
        });

        it('deve exibir botões de ação sticky', () => {
          cy.visit('/cameras/new');
          cy.get('[data-testid="form-actions"]').should('have.css', 'position', 'sticky');
        });
      });

      describe('PWA Features', () => {
        it('deve ter manifest válido', () => {
          cy.request('/manifest.json').then((response) => {
            expect(response.body).to.have.property('name');
            expect(response.body).to.have.property('icons');
          });
        });

        it('deve exibir splash screen', () => {
          cy.visit('/');
          cy.get('[data-testid="splash-screen"]').should('be.visible');
        });
      });
    });
  });
});
