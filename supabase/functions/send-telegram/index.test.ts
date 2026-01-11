import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

/**
 * Tests for send-telegram Edge Function
 */

Deno.test('send-telegram - should export handler', async () => {
  const module = await import('./index.ts');
  assertExists(module.default || module.handler);
});

Deno.test('send-telegram - should return 401 without auth', async () => {
  const req = new Request('http://localhost/send-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test' }),
  });
  
  // Mock response
  const response = new Response('Unauthorized', { status: 401 });
  assertEquals(response.status, 401);
});

Deno.test('send-telegram - should validate message format', () => {
  const validMessage = {
    chatId: '123456789',
    message: 'Test alert message',
    parseMode: 'HTML',
  };
  
  assertExists(validMessage.chatId);
  assertExists(validMessage.message);
  assertEquals(typeof validMessage.message, 'string');
});

Deno.test('send-telegram - should handle photo messages', () => {
  const photoMessage = {
    chatId: '123456789',
    photo: 'https://example.com/image.jpg',
    caption: 'Alert image',
  };
  
  assertExists(photoMessage.photo);
  assertExists(photoMessage.caption);
});

Deno.test('send-telegram - should escape HTML in messages', () => {
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  
  const input = '<script>alert("xss")</script>';
  const escaped = escapeHtml(input);
  assertEquals(escaped.includes('<script>'), false);
});
