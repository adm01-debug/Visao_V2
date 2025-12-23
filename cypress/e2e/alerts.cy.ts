describe("Alerts Page", () => {
  beforeEach(() => {
    cy.visit("/alerts");
  });

  it("should display alerts list", () => {
    cy.get("[data-testid=alerts-list]").should("be.visible");
  });

  it("should filter by severity", () => {
    cy.get("[data-testid=severity-filter]").click();
    cy.get("[data-testid=severity-high]").click();
    cy.get("[data-testid=alert-card]").each(($card) => {
      cy.wrap($card).find("[data-testid=severity-badge]").should("contain", "high");
    });
  });

  it("should acknowledge alert", () => {
    cy.get("[data-testid=alert-card]").first().find("[data-testid=acknowledge-btn]").click();
    cy.get("[data-testid=alert-card]").first().should("have.class", "acknowledged");
  });
});
