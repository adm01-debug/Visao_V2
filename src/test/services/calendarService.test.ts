import { describe, it, expect, beforeEach } from "vitest";
import { calendarService } from "@/services/calendarService";

describe("calendarService", () => {
  const baseEvent = {
    title: "Meeting",
    start: new Date("2026-03-15T10:00:00Z"),
    end: new Date("2026-03-15T11:00:00Z"),
    description: "Team sync",
  };

  it("createEvent returns event with id", async () => {
    const event = await calendarService.createEvent(baseEvent);
    expect(event.id).toBeDefined();
    expect(event.title).toBe("Meeting");
  });

  it("getEvents filters by date range", async () => {
    await calendarService.createEvent(baseEvent);
    const events = await calendarService.getEvents(
      new Date("2026-03-15T00:00:00Z"),
      new Date("2026-03-15T23:59:59Z")
    );
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("getEvents excludes out-of-range events", async () => {
    const events = await calendarService.getEvents(
      new Date("2020-01-01"),
      new Date("2020-01-02")
    );
    expect(events).toHaveLength(0);
  });

  it("updateEvent modifies event", async () => {
    const event = await calendarService.createEvent(baseEvent);
    const updated = await calendarService.updateEvent(event.id, { title: "Updated" });
    expect(updated?.title).toBe("Updated");
  });

  it("updateEvent returns null for unknown id", async () => {
    expect(await calendarService.updateEvent("unknown", { title: "X" })).toBeNull();
  });

  it("deleteEvent removes event", async () => {
    const event = await calendarService.createEvent({ ...baseEvent, title: "ToDelete" });
    expect(await calendarService.deleteEvent(event.id)).toBe(true);
  });

  it("deleteEvent returns false for unknown id", async () => {
    expect(await calendarService.deleteEvent("unknown")).toBe(false);
  });

  it("generateICS produces valid ICS format", async () => {
    const event = await calendarService.createEvent(baseEvent);
    const ics = calendarService.generateICS(event);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Meeting");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("configure does not throw", () => {
    expect(() => calendarService.configure("local")).not.toThrow();
    expect(() => calendarService.configure("google")).not.toThrow();
  });
});
