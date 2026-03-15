import { describe, it, expect } from "vitest";
import { formatCPF, formatCNPJ, isValidCPF, isValidCNPJ } from "@/lib/formatDocument";

describe("formatDocument", () => {
  describe("formatCPF", () => {
    it("formats 11 digits", () => expect(formatCPF("12345678909")).toBe("123.456.789-09"));
    it("returns original for wrong length", () => expect(formatCPF("123")).toBe("123"));
    it("handles already formatted", () => {
      expect(formatCPF("123.456.789-09")).toBe("123.456.789-09");
    });
  });

  describe("formatCNPJ", () => {
    it("formats 14 digits", () => expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81"));
    it("returns original for wrong length", () => expect(formatCNPJ("123")).toBe("123"));
  });

  describe("isValidCPF", () => {
    it("validates known valid CPFs", () => {
      expect(isValidCPF("529.982.247-25")).toBe(true);
      expect(isValidCPF("52998224725")).toBe(true);
    });
    it("rejects all same digits", () => {
      expect(isValidCPF("111.111.111-11")).toBe(false);
      expect(isValidCPF("000.000.000-00")).toBe(false);
    });
    it("rejects wrong check digits", () => {
      expect(isValidCPF("529.982.247-00")).toBe(false);
    });
    it("rejects wrong length", () => {
      expect(isValidCPF("123")).toBe(false);
      expect(isValidCPF("")).toBe(false);
    });
    it("rejects random invalid", () => {
      expect(isValidCPF("12345678900")).toBe(false);
    });
  });

  describe("isValidCNPJ", () => {
    it("validates known valid CNPJ", () => {
      expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
      expect(isValidCNPJ("11222333000181")).toBe(true);
    });
    it("rejects all same digits", () => {
      expect(isValidCNPJ("11111111111111")).toBe(false);
    });
    it("rejects wrong length", () => {
      expect(isValidCNPJ("123")).toBe(false);
    });
    it("rejects wrong check digits", () => {
      expect(isValidCNPJ("11222333000100")).toBe(false);
    });
  });
});
