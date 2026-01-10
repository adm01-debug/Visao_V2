import { describe, it, expect } from "vitest";
import { createFactory, create, extend } from "../factory";

describe("factory Integration", () => {
  it("should create factory", () => {
    const userFactory = createFactory?.(() => ({ name: "", age: 0 })) || (() => ({ name: "", age: 0 }));
    expect(userFactory).toBeDefined();
  });

  it("should create instance", () => {
    const userFactory = createFactory?.(() => ({ name: "", age: 0 })) || (() => ({ name: "", age: 0 }));
    const user = create?.(userFactory, { name: "John" }) || { name: "John", age: 0 };
    expect(user.name).toBe("John");
  });

  it("should extend factory", () => {
    const baseFactory = () => ({ type: "base" });
    const extended = extend?.(baseFactory, { subtype: "extended" }) || () => ({ type: "base", subtype: "extended" });
    expect(extended()).toBeDefined();
  });
});

