import{describe,it,expect}from"vitest";import{formatNumber,formatCurrency}from"../formatters";describe("formatters",()=>{it("formatNumber works",()=>{expect(formatNumber(1000)).toContain("1");});});
