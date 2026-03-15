import { describe, it, expect } from "vitest";
import {
  capitalize, capitalizeWords, camelCase, pascalCase, kebabCase, snakeCase,
  truncate, truncateWords, slugify, stripHtml, escapeHtml, unescapeHtml,
  reverse, isPalindrome, countWords, countChars, padCenter,
  removeAccents, mask, isBlank, isEmpty, wordWrap,
} from "@/utils/string";

describe("string utils", () => {
  describe("capitalize", () => {
    it("capitalizes first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
      expect(capitalize("a")).toBe("A");
      expect(capitalize("")).toBe("");
      expect(capitalize("HELLO")).toBe("HELLO");
      expect(capitalize("hELLO")).toBe("HELLO");
    });
  });

  describe("capitalizeWords", () => {
    it("capitalizes each word", () => {
      expect(capitalizeWords("hello world")).toBe("Hello World");
      expect(capitalizeWords("foo bar baz")).toBe("Foo Bar Baz");
      expect(capitalizeWords("a")).toBe("A");
    });
  });

  describe("camelCase", () => {
    it("converts to camelCase", () => {
      expect(camelCase("hello-world")).toBe("helloWorld");
      expect(camelCase("foo_bar_baz")).toBe("fooBarBaz");
      expect(camelCase("Hello World")).toBe("helloWorld");
      expect(camelCase("already")).toBe("already");
    });
  });

  describe("pascalCase", () => {
    it("converts to PascalCase", () => {
      expect(pascalCase("hello-world")).toBe("HelloWorld");
      expect(pascalCase("foo_bar")).toBe("FooBar");
    });
  });

  describe("kebabCase", () => {
    it("converts to kebab-case", () => {
      expect(kebabCase("helloWorld")).toBe("hello-world");
      expect(kebabCase("FooBar")).toBe("foo-bar");
      expect(kebabCase("hello world")).toBe("hello-world");
      expect(kebabCase("foo_bar")).toBe("foo-bar");
    });
  });

  describe("snakeCase", () => {
    it("converts to snake_case", () => {
      expect(snakeCase("helloWorld")).toBe("hello_world");
      expect(snakeCase("FooBar")).toBe("foo_bar");
      expect(snakeCase("hello-world")).toBe("hello_world");
    });
  });

  describe("truncate", () => {
    it("truncates long strings", () => {
      expect(truncate("hello world", 8)).toBe("hello...");
      expect(truncate("short", 10)).toBe("short");
      expect(truncate("exactly10!", 10)).toBe("exactly10!");
      expect(truncate("abcdefghijk", 5)).toBe("ab...");
    });
    it("uses custom suffix", () => {
      expect(truncate("hello world", 8, "…")).toBe("hello w…");
    });
  });

  describe("truncateWords", () => {
    it("truncates by word count", () => {
      expect(truncateWords("one two three four", 2)).toBe("one two...");
      expect(truncateWords("single", 5)).toBe("single");
    });
  });

  describe("slugify", () => {
    it("creates URL-safe slugs", () => {
      expect(slugify("Hello World")).toBe("hello-world");
      expect(slugify("Câmera de Segurança")).toBe("camera-de-seguranca");
      expect(slugify("  spaces  ")).toBe("spaces");
      expect(slugify("special!@#chars")).toBe("specialchars");
      expect(slugify("múltiplos---hifens")).toBe("multiplos-hifens");
    });
  });

  describe("stripHtml", () => {
    it("removes HTML tags", () => {
      expect(stripHtml("<p>hello</p>")).toBe("hello");
      expect(stripHtml("<b>bold</b> and <i>italic</i>")).toBe("bold and italic");
      expect(stripHtml("no tags")).toBe("no tags");
    });
  });

  describe("escapeHtml / unescapeHtml", () => {
    it("escapes and unescapes HTML entities", () => {
      const original = '<p>"Hello" & \'World\'</p>';
      const escaped = escapeHtml(original);
      expect(escaped).toContain("&lt;");
      expect(escaped).toContain("&amp;");
      expect(unescapeHtml(escaped)).toBe(original);
    });
  });

  describe("reverse", () => {
    it("reverses strings", () => {
      expect(reverse("hello")).toBe("olleh");
      expect(reverse("")).toBe("");
      expect(reverse("a")).toBe("a");
    });
  });

  describe("isPalindrome", () => {
    it("detects palindromes", () => {
      expect(isPalindrome("racecar")).toBe(true);
      expect(isPalindrome("A man a plan a canal Panama")).toBe(true);
      expect(isPalindrome("hello")).toBe(false);
      expect(isPalindrome("")).toBe(true);
    });
  });

  describe("countWords", () => {
    it("counts words correctly", () => {
      expect(countWords("hello world")).toBe(2);
      expect(countWords("  multiple   spaces  ")).toBe(2);
      expect(countWords("single")).toBe(1);
      expect(countWords("")).toBe(0);
    });
  });

  describe("countChars", () => {
    it("counts character occurrences", () => {
      expect(countChars("hello", "l")).toBe(2);
      expect(countChars("aaa", "a")).toBe(3);
      expect(countChars("hello", "z")).toBe(0);
    });
  });

  describe("padCenter", () => {
    it("centers string", () => {
      expect(padCenter("hi", 6)).toBe("  hi  ");
      expect(padCenter("hi", 7)).toBe("  hi   ");
      expect(padCenter("hi", 7, "-")).toBe("--hi---");
    });
  });

  describe("removeAccents", () => {
    it("removes accents", () => {
      expect(removeAccents("café")).toBe("cafe");
      expect(removeAccents("São Paulo")).toBe("Sao Paulo");
      expect(removeAccents("vigilância")).toBe("vigilancia");
    });
  });

  describe("mask", () => {
    it("masks strings", () => {
      expect(mask("1234567890", "*", 3, 2)).toBe("123*****90");
      expect(mask("ab", "*", 1, 1)).toBe("ab");
    });
  });

  describe("isBlank / isEmpty", () => {
    it("checks blank/empty correctly", () => {
      expect(isBlank("")).toBe(true);
      expect(isBlank("   ")).toBe(true);
      expect(isBlank(null)).toBe(true);
      expect(isBlank(undefined)).toBe(true);
      expect(isBlank("text")).toBe(false);

      expect(isEmpty("")).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty(" ")).toBe(false); // has length
    });
  });
});
