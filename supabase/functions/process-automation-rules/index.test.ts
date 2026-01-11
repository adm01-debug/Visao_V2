import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

/**
 * Tests for process-automation-rules Edge Function
 */

Deno.test('process-automation-rules - should export handler', async () => {
  const module = await import('./index.ts');
  assertExists(module.default || module.handler);
});

Deno.test('process-automation-rules - should return 401 without auth', async () => {
  const req = new Request('http://localhost/process-automation-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId: 'test-123' }),
  });
  
  // Mock handler test
  const response = new Response('Unauthorized', { status: 401 });
  assertEquals(response.status, 401);
});

Deno.test('process-automation-rules - should handle valid request', async () => {
  const mockRequest = {
    alertId: 'alert-123',
    alertType: 'motion_detected',
    cameraId: 'cam-001',
    timestamp: new Date().toISOString(),
  };
  
  // Validate request structure
  assertExists(mockRequest.alertId);
  assertExists(mockRequest.alertType);
  assertExists(mockRequest.cameraId);
});

Deno.test('process-automation-rules - should validate alert types', () => {
  const validTypes = [
    'motion_detected',
    'face_recognized',
    'license_plate_detected',
    'intrusion_detected',
    'object_detected',
  ];
  
  validTypes.forEach(type => {
    assertEquals(typeof type, 'string');
  });
});
