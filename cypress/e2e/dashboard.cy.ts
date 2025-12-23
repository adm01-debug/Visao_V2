describe("Dashboard", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should display dashboard title", () => {
    cy.contains("Dashboard").should("be.visible");
  });

  it("should navigate to cameras page", () => {
    cy.get("[data-testid=nav-cameras]").click();
    cy.url().should("include", "/cameras");
  });

  it("should navigate to alerts page", () => {
    cy.get("[data-testid=nav-alerts]").click();
    cy.url().should("include", "/alerts");
  });

  it("should toggle theme", () => {
    cy.get("[data-testid=theme-toggle]").click();
    cy.get("html").should("have.class", "dark");
  });
});
