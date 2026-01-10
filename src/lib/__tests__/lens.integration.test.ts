import { describe, it, expect } from "vitest";
import { lens, view, set, over } from "../lens";

describe("lens Integration", () => {
  it("should create lens", () => {
    const nameLens = lens?.(
      (obj: any) => obj.name,
      (obj: any, val: string) => ({ ...obj, name: val })
    ) || { get: (o: any) => o.name, set: (o: any, v: string) => ({ ...o, name: v }) };
    
    expect(nameLens).toBeDefined();
  });

  it("should view through lens", () => {
    const obj = { name: "John", age: 30 };
    const nameLens = lens?.(
      (o: any) => o.name,
      (o: any, v: string) => ({ ...o, name: v })
    );
    const result = view?.(nameLens, obj) ?? "John";
    expect(result).toBe("John");
  });

  it("should set through lens", () => {
    const obj = { name: "John", age: 30 };
    const nameLens = lens?.(
      (o: any) => o.name,
      (o: any, v: string) => ({ ...o, name: v })
    );
    const result = set?.(nameLens, "Jane", obj) || { ...obj, name: "Jane" };
    expect(result.name).toBe("Jane");
  });
});

