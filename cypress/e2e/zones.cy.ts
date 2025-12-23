describe("Zones", () => {
  beforeEach(() => cy.visit("/zones"));
  it("loads zones page", () => {
    cy.contains("Zonas").should("be.visible");
  });
  it("opens zone editor", () => {
    cy.get("[data-testid=add-zone]").click();
    cy.get("[data-testid=zone-editor]").should("be.visible");
  });
});
