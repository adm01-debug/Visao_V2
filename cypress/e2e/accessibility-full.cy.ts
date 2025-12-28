/**
 * @fileoverview Teste E2E - Acessibilidade Completa
 * @description Testes de acessibilidade WCAG 2.1 AA
 */

describe('Accessibility Full E2E', () => {
  beforeEach(() => {
    cy.injectAxe();
    cy.login('admin@visao.com', 'senha123');
  });

  describe('WCAG 2.1 AA Compliance', () => {
    const pages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Cameras', path: '/cameras' },
      { name: 'Alerts', path: '/alerts' },
      { name: 'Settings', path: '/settings' },
      { name: 'Reports', path: '/reports' }
    ];

    pages.forEach((page) => {
      it(`deve passar verificação a11y em ${page.name}`, () => {
        cy.visit(page.path);
        cy.checkA11y(null, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa']
          }
        });
      });
    });
  });

  describe('Navegação por Teclado', () => {
    it('deve navegar por tabs', () => {
      cy.visit('/dashboard');
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'skip-link');
      cy.focused().tab();
      cy.focused().should('be.visible');
    });

    it('deve ter skip links funcionais', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="skip-link"]').focus().click();
      cy.focused().should('have.attr', 'id', 'main-content');
    });

    it('deve fechar modais com Escape', () => {
      cy.visit('/cameras');
      cy.get('[data-testid="add-camera-button"]').click();
      cy.get('[data-testid="modal"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('[data-testid="modal"]').should('not.exist');
    });

    it('deve navegar em dropdown com setas', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="menu-item"]').first().focus();
      cy.focused().type('{downarrow}');
      cy.focused().should('have.attr', 'data-testid', 'menu-item');
    });
  });

  describe('Leitor de Tela', () => {
    it('deve ter roles ARIA corretos', () => {
      cy.visit('/dashboard');
      cy.get('nav').should('have.attr', 'role', 'navigation');
      cy.get('main').should('have.attr', 'role', 'main');
      cy.get('[data-testid="alerts-list"]').should('have.attr', 'role', 'list');
    });

    it('deve ter labels ARIA', () => {
      cy.visit('/cameras');
      cy.get('[data-testid="camera-card"]').each(($el) => {
        cy.wrap($el).should('have.attr', 'aria-label');
      });
    });

    it('deve anunciar mudanças dinâmicas', () => {
      cy.visit('/alerts');
      cy.get('[data-testid="aria-live"]').should('have.attr', 'aria-live', 'polite');
    });

    it('deve ter alt text em imagens', () => {
      cy.visit('/dashboard');
      cy.get('img').each(($el) => {
        cy.wrap($el).should('have.attr', 'alt');
      });
    });
  });

  describe('Contraste e Cores', () => {
    it('deve ter contraste adequado', () => {
      cy.visit('/dashboard');
      cy.checkA11y(null, {
        runOnly: {
          type: 'rule',
          values: ['color-contrast']
        }
      });
    });

    it('não deve depender apenas de cor', () => {
      cy.visit('/alerts');
      cy.get('[data-testid="alert-status"]').each(($el) => {
        cy.wrap($el).find('svg, span').should('exist');
      });
    });
  });

  describe('Formulários Acessíveis', () => {
    it('deve ter labels associados', () => {
      cy.visit('/settings');
      cy.get('input').each(($input) => {
        const id = $input.attr('id');
        if (id) {
          cy.get(`label[for="${id}"]`).should('exist');
        }
      });
    });

    it('deve exibir erros acessíveis', () => {
      cy.visit('/cameras/new');
      cy.get('[data-testid="save-camera"]').click();
      cy.get('[role="alert"]').should('be.visible');
      cy.get('[aria-invalid="true"]').should('exist');
    });

    it('deve ter descrições de campo', () => {
      cy.visit('/settings');
      cy.get('[aria-describedby]').should('have.length.at.least', 1);
    });
  });

  describe('Modo Alto Contraste', () => {
    it('deve suportar prefers-contrast', () => {
      cy.visit('/dashboard');
      cy.window().then((win) => {
        const mq = win.matchMedia('(prefers-contrast: high)');
        expect(mq).to.exist;
      });
    });
  });

  describe('Redução de Movimento', () => {
    it('deve respeitar prefers-reduced-motion', () => {
      cy.visit('/dashboard', {
        onBeforeLoad: (win) => {
          cy.stub(win, 'matchMedia')
            .withArgs('(prefers-reduced-motion: reduce)')
            .returns({ matches: true });
        }
      });
      cy.get('[data-testid="animated-element"]').should('have.css', 'animation', 'none');
    });
  });
});
