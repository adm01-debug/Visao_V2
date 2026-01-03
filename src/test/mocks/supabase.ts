/**
 * VISÃO - Mock do Supabase para Testes
 * Simula operações do banco de dados
 */

import { vi } from 'vitest';

// Mock data
export const mockCameraData = [
  {
    id: 'cam-1',
    name: 'Câmera Entrada',
    location: 'Portaria',
    status: 'online',
    detected_people: 5,
    alerts_count: 2,
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cam-2',
    name: 'Câmera Estacionamento',
    location: 'Garagem',
    status: 'offline',
    detected_people: 0,
    alerts_count: 0,
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockAlertData = [
  {
    id: 'alert-1',
    camera_id: 'cam-1',
    camera_name: 'Câmera Entrada',
    type: 'security',
    severity: 'high',
    message: 'Movimento detectado em área restrita',
    timestamp: '2024-01-01T10:00:00Z',
    is_read: false,
    user_id: 'user-1',
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'alert-2',
    camera_id: 'cam-2',
    camera_name: 'Câmera Estacionamento',
    type: 'safety',
    severity: 'medium',
    message: 'Pessoa sem EPI detectada',
    timestamp: '2024-01-01T09:00:00Z',
    is_read: true,
    user_id: 'user-1',
    created_at: '2024-01-01T09:00:00Z',
  },
];

export const mockRulesData = [
  {
    id: 'rule-1',
    name: 'Detecção de Movimento',
    description: 'Alerta quando movimento é detectado',
    category: 'security',
    severity: 'high',
    is_active: true,
    conditions: [],
    actions: ['alert'],
    cameras: [],
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Supabase Query Builder Mock
const createQueryBuilder = (data: any[], error: any = null) => {
  let filteredData = [...data];
  let selectedFields: string | null = null;
  
  const builder: any = {
    select: vi.fn((fields = '*') => {
      selectedFields = fields;
      return builder;
    }),
    insert: vi.fn((insertData) => {
      const newItem = { id: `new-${Date.now()}`, ...insertData };
      filteredData = [newItem];
      return builder;
    }),
    update: vi.fn((updateData) => {
      filteredData = filteredData.map(item => ({ ...item, ...updateData }));
      return builder;
    }),
    delete: vi.fn(() => builder),
    eq: vi.fn((field, value) => {
      filteredData = filteredData.filter(item => item[field] === value);
      return builder;
    }),
    neq: vi.fn((field, value) => {
      filteredData = filteredData.filter(item => item[field] !== value);
      return builder;
    }),
    in: vi.fn((field, values) => {
      filteredData = filteredData.filter(item => values.includes(item[field]));
      return builder;
    }),
    gte: vi.fn((field, value) => {
      filteredData = filteredData.filter(item => item[field] >= value);
      return builder;
    }),
    lte: vi.fn((field, value) => {
      filteredData = filteredData.filter(item => item[field] <= value);
      return builder;
    }),
    order: vi.fn(() => builder),
    limit: vi.fn((n) => {
      filteredData = filteredData.slice(0, n);
      return builder;
    }),
    range: vi.fn((start, end) => {
      filteredData = filteredData.slice(start, end + 1);
      return builder;
    }),
    single: vi.fn(() => {
      return Promise.resolve({
        data: filteredData[0] || null,
        error: filteredData.length === 0 ? { message: 'Not found' } : error,
      });
    }),
    maybeSingle: vi.fn(() => {
      return Promise.resolve({
        data: filteredData[0] || null,
        error,
      });
    }),
    then: (resolve: any) => {
      resolve({ data: filteredData, error, count: filteredData.length });
    },
  };
  
  return builder;
};

// Create mock Supabase client
export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn((table: string) => {
    switch (table) {
      case 'cameras':
        return createQueryBuilder(mockCameraData);
      case 'alerts':
        return createQueryBuilder(mockAlertData);
      case 'rules':
        return createQueryBuilder(mockRulesData);
      default:
        return createQueryBuilder([]);
    }
  });

  const mockChannel = vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
  }));

  const mockAuth = {
    getUser: vi.fn(() => Promise.resolve({ 
      data: { user: { id: 'user-1', email: 'test@test.com' } }, 
      error: null 
    })),
    getSession: vi.fn(() => Promise.resolve({ 
      data: { session: { user: { id: 'user-1' } } }, 
      error: null 
    })),
    signInWithPassword: vi.fn(() => Promise.resolve({ 
      data: { user: { id: 'user-1' } }, 
      error: null 
    })),
    signUp: vi.fn(() => Promise.resolve({ 
      data: { user: { id: 'user-1' } }, 
      error: null 
    })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn((callback) => {
      callback('SIGNED_IN', { user: { id: 'user-1' } });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };

  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test.jpg' }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.jpg' } })),
      download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
      remove: vi.fn(() => Promise.resolve({ error: null })),
      list: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  };

  return {
    from: mockFrom,
    channel: mockChannel,
    auth: mockAuth,
    storage: mockStorage,
    removeChannel: vi.fn(),
  };
};

// Default mock instance
export const mockSupabase = createMockSupabaseClient();

// Mock the supabase client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));
