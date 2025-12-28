/**
 * @fileoverview Teste E2E - Localização
 * @description Testes de internacionalização e localização
 */

describe('Localization E2E', () => {
  const locales = [
    { code: 'pt-BR', name: 'Português', sample: 'Dashboard' },
    { code: 'en-US', name: 'English', sample: 'Dashboard' },
    { code: 'es-ES', name: 'Español', sample: 'Panel' }
  ];

  beforeEach(() => {
    cy.login('admin@visao.com', 'senha123');
  });

  describe('Troca de Idioma', () => {
    locales.forEach((locale) => {
      it(`deve trocar para ${locale.name}`, () => {
        cy.visit('/settings');
        cy.get('[data-testid="language-select"]').select(locale.code);
        cy.get('[data-testid="save-settings"]').click();
        cy.reload();
        cy.get('[data-testid="page-title"]').should('contain', locale.sample);
      });
    });
  });

  describe('Formatação de Data', () => {
    it('deve formatar data em pt-BR', () => {
      cy.visit('/settings');
      cy.get('[data-testid="language-select"]').select('pt-BR');
      cy.visit('/alerts');
      cy.get('[data-testid="alert-date"]').first().should('match', /\d{2}\/\d{2}\/\d{4}/);
    });

    it('deve formatar data em en-US', () => {
      cy.visit('/settings');
      cy.get('[data-testid="language-select"]').select('en-US');
      cy.visit('/alerts');
      cy.get('[data-testid="alert-date"]').first().should('match', /\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('Formatação de Números', () => {
    it('deve formatar números em pt-BR', () => {
      cy.visit('/settings');
      cy.get('[data-testid="language-select"]').select('pt-BR');
      cy.visit('/analytics');
      cy.get('[data-testid="stat-value"]').should('contain', '.');
    });
  });

  describe('RTL Support', () => {
    it('deve suportar direção RTL', () => {
      cy.visit('/settings');
      cy.get('[data-testid="language-select"]').select('ar-SA');
      cy.reload();
      cy.get('html').should('have.attr', 'dir', 'rtl');
    });
  });

  describe('Pluralização', () => {
    it('deve pluralizar corretamente em pt-BR', () => {
      cy.visit('/cameras');
      cy.get('[data-testid="camera-count"]').should('match', /(câmera|câmeras)/);
    });
  });

  describe('Timezone', () => {
    it('deve exibir horário local', () => {
      cy.visit('/alerts');
      cy.get('[data-testid="alert-time"]').first().then(($el) => {
        const time = $el.text();
        expect(time).to.match(/\d{2}:\d{2}/);
      });
    });
  });

  describe('Fallback de Tradução', () => {
    it('deve usar fallback para chaves ausentes', () => {
      cy.intercept('GET', '/locales/pt-BR.json', (req) => {
        req.reply({ common: {} });
      });
      cy.visit('/dashboard');
      cy.get('[data-testid="page-title"]').should('not.contain', 'translation.missing');
    });
  });
});
