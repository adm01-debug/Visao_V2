/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(email: string, password: string): Chainable<void>;
    logout(): Chainable<void>;
  }
}

Cypress.Commands.add("login", (email: string, password: string) => {
  cy.visit("/login");
  cy.get("[data-testid=email-input]").type(email);
  cy.get("[data-testid=password-input]").type(password);
  cy.get("[data-testid=login-button]").click();
  cy.url().should("include", "/dashboard");
});

Cypress.Commands.add("logout", () => {
  cy.get("[data-testid=logout-button]").click();
  cy.url().should("include", "/login");
});
