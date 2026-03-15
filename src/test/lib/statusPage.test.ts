import { describe, it, expect } from "vitest";
import { StatusPage } from "@/lib/statusPage";

describe("StatusPage", () => {
  it("starts operational with no services", () => {
    const sp = new StatusPage();
    expect(sp.getStatus().overall).toBe("operational");
    expect(sp.getStatus().services).toHaveLength(0);
  });

  it("updateService adds new service", () => {
    const sp = new StatusPage();
    sp.updateService("API", "operational");
    expect(sp.getStatus().services).toHaveLength(1);
    expect(sp.getStatus().services[0].name).toBe("API");
  });

  it("updateService updates existing service", () => {
    const sp = new StatusPage();
    sp.updateService("DB", "operational");
    sp.updateService("DB", "degraded");
    expect(sp.getStatus().services).toHaveLength(1);
    expect(sp.getStatus().services[0].status).toBe("degraded");
  });

  it("overall is degraded when any service is degraded", () => {
    const sp = new StatusPage();
    sp.updateService("API", "operational");
    sp.updateService("DB", "degraded");
    expect(sp.getStatus().overall).toBe("degraded");
  });

  it("overall is outage when any service has outage", () => {
    const sp = new StatusPage();
    sp.updateService("API", "operational");
    sp.updateService("DB", "outage");
    expect(sp.getStatus().overall).toBe("outage");
  });

  it("outage takes priority over degraded", () => {
    const sp = new StatusPage();
    sp.updateService("A", "degraded");
    sp.updateService("B", "outage");
    expect(sp.getStatus().overall).toBe("outage");
  });

  it("updatedAt is set", () => {
    const sp = new StatusPage();
    sp.updateService("X", "operational");
    expect(sp.getStatus().services[0].updatedAt).toBeInstanceOf(Date);
  });
});
