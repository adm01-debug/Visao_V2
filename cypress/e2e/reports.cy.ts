describe("Reports", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/reports");
  });

  it("should display reports page", () => {
    cy.contains("Relatórios").should("be.visible");
  });

  it("should show report types", () => {
    cy.get("[data-testid=report-types]").should("exist");
    cy.contains("Relatório de Alertas").should("be.visible");
    cy.contains("Relatório de Detecções").should("be.visible");
  });

  it("should generate alert report", () => {
    cy.get("[data-testid=report-alerts]").click();
    cy.get("[data-testid=date-range]").should("be.visible");
    cy.get("[data-testid=generate-btn]").click();
    cy.get("[data-testid=report-preview]").should("be.visible");
  });

  it("should export report as PDF", () => {
    cy.get("[data-testid=report-alerts]").click();
    cy.get("[data-testid=generate-btn]").click();
    cy.get("[data-testid=export-pdf]").click();
  });

  it("should export report as CSV", () => {
    cy.get("[data-testid=report-alerts]").click();
    cy.get("[data-testid=generate-btn]").click();
    cy.get("[data-testid=export-csv]").click();
  });

  it("should filter reports by camera", () => {
    cy.get("[data-testid=camera-filter]").click();
    cy.get("[data-testid=camera-option]").first().click();
  });

  it("should show report statistics", () => {
    cy.get("[data-testid=report-alerts]").click();
    cy.get("[data-testid=generate-btn]").click();
    cy.get("[data-testid=stats-summary]").should("be.visible");
  });
});
