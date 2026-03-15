import { describe, it, expect } from "vitest";
import { required, minLength, maxLength, email, phone, cpf, cnpj, pattern, range, url } from "@/lib/validationRules";

describe("validationRules", () => {
  describe("required", () => {
    const rule = required();
    it("fails null", () => expect(rule(null)).toBe("Campo obrigatório"));
    it("fails undefined", () => expect(rule(undefined)).toBe("Campo obrigatório"));
    it("fails empty string", () => expect(rule("")).toBe("Campo obrigatório"));
    it("passes value", () => expect(rule("hello")).toBeNull());
    it("passes zero", () => expect(rule(0)).toBeNull());
    it("custom message", () => expect(required("Required!")(null)).toBe("Required!"));
  });

  describe("minLength", () => {
    it("fails short string", () => expect(minLength(3)("ab")).toBe("Mínimo 3 caracteres"));
    it("passes exact length", () => expect(minLength(3)("abc")).toBeNull());
    it("passes longer", () => expect(minLength(3)("abcdef")).toBeNull());
    it("custom message", () => expect(minLength(3, "Too short")("ab")).toBe("Too short"));
  });

  describe("maxLength", () => {
    it("fails long string", () => expect(maxLength(3)("abcd")).toBe("Máximo 3 caracteres"));
    it("passes exact length", () => expect(maxLength(3)("abc")).toBeNull());
    it("passes shorter", () => expect(maxLength(3)("ab")).toBeNull());
  });

  describe("email", () => {
    const rule = email();
    it("passes valid", () => expect(rule("a@b.com")).toBeNull());
    it("fails invalid", () => expect(rule("not-email")).toBe("E-mail inválido"));
    it("fails empty", () => expect(rule("")).toBe("E-mail inválido"));
  });

  describe("phone", () => {
    const rule = phone();
    it("passes valid BR mobile", () => expect(rule("11999999999")).toBeNull());
    it("passes valid BR landline", () => expect(rule("1133334444")).toBeNull());
    it("fails too short", () => expect(rule("123")).toBe("Telefone inválido"));
  });

  describe("cpf", () => {
    const rule = cpf();
    it("passes valid CPF", () => expect(rule("529.982.247-25")).toBeNull());
    it("fails invalid CPF", () => expect(rule("111.111.111-11")).toBe("CPF inválido"));
    it("fails wrong length", () => expect(rule("123")).toBe("CPF inválido"));
  });

  describe("cnpj", () => {
    const rule = cnpj();
    it("passes valid length CNPJ", () => expect(rule("11222333000181")).toBeNull());
    it("fails wrong length", () => expect(rule("123")).toBe("CNPJ inválido"));
  });

  describe("pattern", () => {
    it("passes matching", () => expect(pattern(/^\d{5}$/, "CEP inválido")("12345")).toBeNull());
    it("fails non-matching", () => expect(pattern(/^\d{5}$/, "CEP inválido")("abc")).toBe("CEP inválido"));
  });

  describe("range", () => {
    it("passes in range", () => expect(range(1, 10)(5)).toBeNull());
    it("passes at min", () => expect(range(1, 10)(1)).toBeNull());
    it("passes at max", () => expect(range(1, 10)(10)).toBeNull());
    it("fails below", () => expect(range(1, 10)(0)).toBe("Valor deve estar entre 1 e 10"));
    it("fails above", () => expect(range(1, 10)(11)).toBe("Valor deve estar entre 1 e 10"));
    it("custom message", () => expect(range(0, 100, "Fora do range")(200)).toBe("Fora do range"));
  });

  describe("url", () => {
    const rule = url();
    it("passes valid URL", () => expect(rule("https://example.com")).toBeNull());
    it("fails invalid URL", () => expect(rule("not a url")).toBe("URL inválida"));
  });
});
