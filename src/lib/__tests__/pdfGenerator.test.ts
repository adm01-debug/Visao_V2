import{describe,it,expect}from"vitest";import{generatePDF}from"../pdfGenerator";describe("pdfGenerator",()=>{it("exports generatePDF",()=>{expect(typeof generatePDF).toBe("function");});});
