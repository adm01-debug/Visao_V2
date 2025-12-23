describe("People", () => {
  beforeEach(() => cy.visit("/people"));
  it("loads people page", () => {
    cy.contains("Pessoas").should("be.visible");
  });
  it("opens person form", () => {
    cy.get("[data-testid=add-person]").click();
    cy.get("[data-testid=person-form]").should("be.visible");
  });
});
