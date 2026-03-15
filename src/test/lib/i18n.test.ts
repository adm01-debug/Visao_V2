import { describe, it, expect, beforeEach } from "vitest";
import { setLocale, getLocale, addTranslations, t } from "@/lib/i18n";

describe("i18n", () => {
  beforeEach(() => {
    setLocale("pt-BR");
    addTranslations("pt-BR", {
      "hello": "Olá",
      "greeting": "Olá, {name}!",
      "items": "{count} itens encontrados",
    });
    addTranslations("en", {
      "hello": "Hello",
      "greeting": "Hello, {name}!",
    });
  });

  describe("locale", () => {
    it("gets current locale", () => { expect(getLocale()).toBe("pt-BR"); });
    it("sets locale", () => { setLocale("en"); expect(getLocale()).toBe("en"); });
  });

  describe("t (translate)", () => {
    it("returns translation", () => { expect(t("hello")).toBe("Olá"); });
    it("returns key when missing", () => { expect(t("unknown.key")).toBe("unknown.key"); });
    it("interpolates params", () => {
      expect(t("greeting", { name: "João" })).toBe("Olá, João!");
    });
    it("interpolates multiple params", () => {
      expect(t("items", { count: "5" })).toBe("5 itens encontrados");
    });
    it("works after locale change", () => {
      setLocale("en");
      expect(t("hello")).toBe("Hello");
    });
    it("returns key for missing locale", () => {
      setLocale("fr");
      expect(t("hello")).toBe("hello");
    });
  });

  describe("addTranslations", () => {
    it("merges with existing", () => {
      addTranslations("pt-BR", { "new_key": "Novo" });
      expect(t("new_key")).toBe("Novo");
      expect(t("hello")).toBe("Olá"); // old still works
    });
  });
});
