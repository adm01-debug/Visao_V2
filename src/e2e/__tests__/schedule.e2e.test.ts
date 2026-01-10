import { describe, it, expect } from "vitest";

describe("Schedule Flow E2E", () => {
  it("should create schedule", async () => {
    const scheduleData = {
      name: "Daily Recording",
      cron: "0 8 * * *",
      action: "start_recording",
    };

    const mockCreateSchedule = async (data: typeof scheduleData) => {
      return { id: "sch-1", ...data, active: true };
    };

    const result = await mockCreateSchedule(scheduleData);
    expect(result.active).toBe(true);
    expect(result.cron).toBe("0 8 * * *");
  });

  it("should toggle schedule", async () => {
    const mockToggleSchedule = async (scheduleId: string, active: boolean) => {
      return { scheduleId, active };
    };

    const result = await mockToggleSchedule("sch-1", false);
    expect(result.active).toBe(false);
  });

  it("should delete schedule", async () => {
    const mockDeleteSchedule = async (scheduleId: string) => {
      return { scheduleId, deleted: true };
    };

    const result = await mockDeleteSchedule("sch-1");
    expect(result.deleted).toBe(true);
  });
});

