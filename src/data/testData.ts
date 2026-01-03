/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Test Data - Dados de teste para testes automatizados
 */

export const testCamera = {
  id: 'test-cam-001',
  name: 'Test Camera 1',
  location: 'Test Location',
  status: 'online' as const,
  detectedPeople: 0,
  alerts: 0,
};

export const testAlert = {
  id: 'test-alert-001',
  cameraId: 'test-cam-001',
  cameraName: 'Test Camera 1',
  type: 'security' as const,
  severity: 'medium' as const,
  message: 'Test alert message',
  timestamp: new Date(),
  isRead: false,
};

export const testUser = {
  id: 'test-user-001',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin' as const,
  createdAt: new Date().toISOString(),
};

export const testRule = {
  id: 'test-rule-001',
  name: 'Test Rule',
  description: 'A test rule for testing purposes',
  category: 'security' as const,
  severity: 'medium' as const,
  conditions: [],
  actions: ['alert'],
  cameras: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const testPerson = {
  id: 'test-person-001',
  name: 'Test Person',
  role: 'Visitor',
  department: 'External',
  status: 'active' as const,
};

export const testVehicle = {
  id: 'test-vehicle-001',
  plate: 'TST0001',
  type: 'car' as const,
  color: 'Blue',
  owner: 'Test Owner',
  status: 'allowed' as const,
};

export const testZone = {
  id: 'test-zone-001',
  name: 'Test Zone',
  type: 'monitored' as const,
  color: '#000000',
  cameraIds: [],
  isActive: true,
};

export const testRecording = {
  id: 'test-rec-001',
  cameraId: 'test-cam-001',
  cameraName: 'Test Camera 1',
  startTime: new Date(),
  endTime: new Date(),
  duration: 60,
  size: 1000000,
  hasAlert: false,
};

export const testAnalytics = {
  totalCameras: 10,
  onlineCameras: 8,
  activeAlerts: 2,
  detectedPeople: 50,
  productivityScore: 85,
  securityScore: 92,
};

// Helper functions for test data generation
export function createTestCamera(overrides: Partial<typeof testCamera> = {}) {
  return { ...testCamera, ...overrides };
}

export function createTestAlert(overrides: Partial<typeof testAlert> = {}) {
  return { ...testAlert, ...overrides };
}

export function createTestUser(overrides: Partial<typeof testUser> = {}) {
  return { ...testUser, ...overrides };
}

export function createTestRule(overrides: Partial<typeof testRule> = {}) {
  return { ...testRule, ...overrides };
}
