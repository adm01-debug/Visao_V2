describe("Cameras Page", () => {
  beforeEach(() => {
    cy.visit("/cameras");
  });

  it("should display cameras grid", () => {
    cy.get("[data-testid=cameras-grid]").should("be.visible");
  });

  it("should open camera modal on click", () => {
    cy.get("[data-testid=camera-card]").first().click();
    cy.get("[data-testid=camera-modal]").should("be.visible");
  });

  it("should filter cameras by status", () => {
    cy.get("[data-testid=status-filter]").click();
    cy.get("[data-testid=status-online]").click();
    cy.get("[data-testid=camera-card]").each(($card) => {
      cy.wrap($card).should("contain", "Online");
    });
  });
});
