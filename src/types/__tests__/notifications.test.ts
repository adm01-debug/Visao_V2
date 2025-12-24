import { describe, it, expectTypeOf } from "vitest";
import type { NotificationType, Notification, NotificationConfig } from "../notifications";

describe("Notification Types", () => {
  it("NotificationType should be union type", () => {
    const type: NotificationType = "success";
    expectTypeOf(type).toEqualTypeOf<"success" | "error" | "warning" | "info">();
  });

  it("Notification should have required fields", () => {
    const notification: Notification = {
      id: "1", type: "success", title: "Title", message: "Message"
    };
    expectTypeOf(notification.id).toBeString();
    expectTypeOf(notification.type).toEqualTypeOf<NotificationType>();
  });

  it("NotificationConfig should have boolean flags", () => {
    const config: NotificationConfig = {
      email: true, push: false, telegram: true, sound: true, desktop: false
    };
    expectTypeOf(config.email).toBeBoolean();
  });
});
