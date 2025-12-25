describe("License Plate Recognition", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/license-plates");
  });

  it("should display ALPR page", () => {
    cy.contains("Reconhecimento de Placas").should("be.visible");
  });

  it("should show detected plates list", () => {
    cy.get("[data-testid=plates-list]").should("exist");
  });

  it("should filter plates by date", () => {
    cy.get("[data-testid=date-filter]").click();
    cy.get("[data-testid=date-picker]").should("be.visible");
  });

  it("should search plates by number", () => {
    cy.get("[data-testid=search-input]").type("ABC1234");
    cy.get("[data-testid=plates-list]").should("contain", "ABC");
  });

  it("should show plate details", () => {
    cy.get("[data-testid=plate-card]").first().click();
    cy.get("[data-testid=plate-details-modal]").should("be.visible");
  });

  it("should export plates data", () => {
    cy.get("[data-testid=export-btn]").click();
    cy.get("[data-testid=export-menu]").should("be.visible");
    cy.contains("Exportar CSV").click();
  });

  it("should add plate to watchlist", () => {
    cy.get("[data-testid=plate-card]").first().find("[data-testid=watchlist-btn]").click();
    cy.contains("Adicionado à lista de observação").should("be.visible");
  });
});
