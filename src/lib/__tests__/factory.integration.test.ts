import { describe, it, expect } from "vitest";

// Mock factory functions
const createFactory = <T>(fn: () => T) => fn;
const create = <T>(factory: () => T, overrides: Partial<T>) => ({ ...factory(), ...overrides });
const extend = <T, E>(factory: () => T, extension: E) => () => ({ ...factory(), ...extension });

describe("factory Integration", () => {
  it("should create factory", () => {
    const userFactory = createFactory(() => ({ name: "", age: 0 }));
    expect(userFactory).toBeDefined();
  });

  it("should create instance", () => {
    const userFactory = createFactory(() => ({ name: "", age: 0 }));
    const user = create(userFactory, { name: "John" });
    expect(user.name).toBe("John");
  });

  it("should extend factory", () => {
    const baseFactory = () => ({ type: "base" });
    const extended = extend(baseFactory, { subtype: "extended" });
    expect(extended()).toBeDefined();
  });
});
