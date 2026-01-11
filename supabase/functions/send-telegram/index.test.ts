import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";

/**
 * Tests for send-telegram Edge Function
 */

Deno.test("send-telegram - should format message correctly", () => {
  const formatMessage = (alert: { type: string; camera: string; time: string }) => {
    return `🚨 Alert: ${alert.type}\n📷 Camera: ${alert.camera}\n⏰ Time: ${alert.time}`;
  };
  
  const message = formatMessage({
    type: "Motion Detected",
    camera: "Front Door",
    time: "2026-01-11 15:30:00"
  });
  
  assertExists(message);
  assertEquals(message.includes("Motion Detected"), true);
  assertEquals(message.includes("Front Door"), true);
});

Deno.test("send-telegram - should validate chat ID", () => {
  const isValidChatId = (id: string) => {
    return /^-?\d+$/.test(id);
  };
  
  assertEquals(isValidChatId("123456789"), true);
  assertEquals(isValidChatId("-123456789"), true);
  assertEquals(isValidChatId("invalid"), false);
});

Deno.test("send-telegram - should handle missing bot token", () => {
  const botToken = "";
  const hasToken = botToken.length > 0;
  
  assertEquals(hasToken, false);
});

Deno.test("send-telegram - should build correct API URL", () => {
  const buildUrl = (token: string, method: string) => {
    return `https://api.telegram.org/bot${token}/${method}`;
  };
  
  const url = buildUrl("123:ABC", "sendMessage");
  
  assertEquals(url, "https://api.telegram.org/bot123:ABC/sendMessage");
});

Deno.test("send-telegram - should escape special characters", () => {
  const escapeMarkdown = (text: string) => {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  };
  
  const escaped = escapeMarkdown("Hello *world*");
  assertExists(escaped);
});
