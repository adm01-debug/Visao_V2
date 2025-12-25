describe("Face Recognition", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/face-recognition");
  });

  it("should display face recognition page", () => {
    cy.contains("Reconhecimento Facial").should("be.visible");
  });

  it("should show registered faces list", () => {
    cy.get("[data-testid=faces-list]").should("exist");
  });

  it("should allow uploading a new face", () => {
    cy.get("[data-testid=upload-face-btn]").click();
    cy.get("[data-testid=upload-modal]").should("be.visible");
    cy.get("input[type=file]").selectFile("cypress/fixtures/test-face.jpg", { force: true });
    cy.get("[data-testid=submit-upload]").click();
    cy.contains("Face cadastrada com sucesso").should("be.visible");
  });

  it("should search faces by name", () => {
    cy.get("[data-testid=search-input]").type("João");
    cy.get("[data-testid=faces-list]").should("contain", "João");
  });

  it("should delete a face", () => {
    cy.get("[data-testid=face-card]").first().find("[data-testid=delete-btn]").click();
    cy.get("[data-testid=confirm-delete]").click();
    cy.contains("Face removida").should("be.visible");
  });

  it("should show face details", () => {
    cy.get("[data-testid=face-card]").first().click();
    cy.get("[data-testid=face-details-modal]").should("be.visible");
    cy.contains("Detalhes da Face").should("be.visible");
  });
});
