describe("Recordings", () => {
  beforeEach(() => cy.visit("/recordings"));
  it("loads recordings page", () => {
    cy.contains("Gravações").should("be.visible");
  });
  it("filters by date", () => {
    cy.get("[data-testid=date-filter]").click();
    cy.get("[data-testid=today]").click();
  });
});
