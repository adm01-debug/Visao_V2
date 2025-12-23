describe("Settings", () => {
  beforeEach(() => cy.visit("/settings"));
  it("loads settings page", () => {
    cy.contains("Configurações").should("be.visible");
  });
  it("toggles dark mode", () => {
    cy.get("[data-testid=theme-toggle]").click();
    cy.get("html").should("have.class", "dark");
  });
});
