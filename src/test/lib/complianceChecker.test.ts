import { describe, it, expect } from "vitest";
import { ComplianceChecker } from "@/lib/complianceChecker";

describe("ComplianceChecker", () => {
  it("checkAll with no rules returns empty", async () => {
    const cc = new ComplianceChecker();
    const r = await cc.checkAll();
    expect(r.passed).toEqual([]);
    expect(r.failed).toEqual([]);
  });

  it("passing rules go to passed", async () => {
    const cc = new ComplianceChecker();
    cc.addRule({ id: "r1", name: "Always pass", check: () => true });
    const r = await cc.checkAll();
    expect(r.passed).toContain("r1");
    expect(r.failed).toHaveLength(0);
  });

  it("failing rules go to failed", async () => {
    const cc = new ComplianceChecker();
    cc.addRule({ id: "r2", name: "Always fail", check: () => false });
    const r = await cc.checkAll();
    expect(r.failed).toContain("r2");
  });

  it("handles async checks", async () => {
    const cc = new ComplianceChecker();
    cc.addRule({ id: "async1", name: "Async pass", check: async () => true });
    cc.addRule({ id: "async2", name: "Async fail", check: async () => false });
    const r = await cc.checkAll();
    expect(r.passed).toContain("async1");
    expect(r.failed).toContain("async2");
  });

  it("mixed results", async () => {
    const cc = new ComplianceChecker();
    cc.addRule({ id: "a", name: "A", check: () => true });
    cc.addRule({ id: "b", name: "B", check: () => false });
    cc.addRule({ id: "c", name: "C", check: () => true });
    const r = await cc.checkAll();
    expect(r.passed).toEqual(["a", "c"]);
    expect(r.failed).toEqual(["b"]);
  });
});
