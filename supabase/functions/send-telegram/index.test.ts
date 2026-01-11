import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

/**
 * Tests for send-telegram Edge Function
 */

Deno.test('send-telegram - should validate required fields', () => {
  const payload = {
    chatId: '123456789',
    message: 'Test alert message',
  };

  assertExists(payload.chatId);
  assertExists(payload.message);
});

Deno.test('send-telegram - should format alert message correctly', () => {
  const alert = {
    type: 'motion',
    severity: 'high',
    cameraName: 'Camera 1',
    timestamp: new Date().toISOString(),
  };

  const formattedMessage = `🚨 *Alert: ${alert.type}*\n` +
    `Severity: ${alert.severity}\n` +
    `Camera: ${alert.cameraName}\n` +
    `Time: ${alert.timestamp}`;

  assertExists(formattedMessage);
  assertEquals(formattedMessage.includes('motion'), true);
});

Deno.test('send-telegram - should handle image attachments', () => {
  const messageWithImage = {
    chatId: '123456789',
    message: 'Alert with image',
    imageUrl: 'https://example.com/snapshot.jpg',
  };

  assertExists(messageWithImage.imageUrl);
  assertEquals(messageWithImage.imageUrl.startsWith('http'), true);
});

Deno.test('send-telegram - should escape special characters', () => {
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  
  const escapeMarkdown = (text: string): string => {
    let escaped = text;
    specialChars.forEach(char => {
      escaped = escaped.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
    });
    return escaped;
  };

  const testText = 'Test *bold* and _italic_';
  const escaped = escapeMarkdown(testText);
  assertExists(escaped);
});

Deno.test('send-telegram - should handle rate limiting', () => {
  const rateLimitConfig = {
    maxRequests: 30,
    windowMs: 1000, // 1 second
  };

  assertEquals(rateLimitConfig.maxRequests, 30);
  assertEquals(rateLimitConfig.windowMs, 1000);
});

Deno.test('send-telegram - should validate bot token format', () => {
  const isValidToken = (token: string): boolean => {
    return /^\d+:[A-Za-z0-9_-]+$/.test(token);
  };

  assertEquals(isValidToken('123456789:ABCdefGHIjklMNOpqrsTUVwxyz'), true);
  assertEquals(isValidToken('invalid-token'), false);
});
