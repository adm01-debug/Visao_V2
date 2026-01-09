/**
 * VISÃO - Mock do Supabase para Testes
 * Simula operações do banco de dados com tipagem forte
 */

import { vi } from "vitest";

// Mock data types
interface MockCamera {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline";
  detected_people: number;
  alerts_count: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface MockAlert {
  id: string;
  camera_id: string;
  camera_name: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  user_id: string;
  created_at: string;
}

interface MockRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  is_active: boolean;
  conditions: unknown[];
  actions: string[];
  cameras: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

type MockData = MockCamera | MockAlert | MockRule;

interface QueryResult<T> {
  data: T | T[] | null;
  error: { message: string } | null;
  count?: number;
}

// Mock data
export const mockCameraData: MockCamera[] = [
  {
    id: "cam-1",
    name: "Câmera Entrada",
    location: "Portaria",
    status: "online",
    detected_people: 5,
    alerts_count: 2,
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "cam-2",
    name: "Câmera Estacionamento",
    location: "Garagem",
    status: "offline",
    detected_people: 0,
    alerts_count: 0,
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export const mockAlertData: MockAlert[] = [
  {
    id: "alert-1",
    camera_id: "cam-1",
    camera_name: "Câmera Entrada",
    type: "security",
    severity: "high",
    message: "Movimento detectado em área restrita",
    timestamp: "2024-01-01T10:00:00Z",
    is_read: false,
    user_id: "user-1",
    created_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "alert-2",
    camera_id: "cam-2",
    camera_name: "Câmera Estacionamento",
    type: "safety",
    severity: "medium",
    message: "Pessoa sem EPI detectada",
    timestamp: "2024-01-01T09:00:00Z",
    is_read: true,
    user_id: "user-1",
    created_at: "2024-01-01T09:00:00Z",
  },
];

export const mockRulesData: MockRule[] = [
  {
    id: "rule-1",
    name: "Detecção de Movimento",
    description: "Alerta quando movimento é detectado",
    category: "security",
    severity: "high",
    is_active: true,
    conditions: [],
    actions: ["alert"],
    cameras: [],
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Query builder type
interface QueryBuilder<T extends MockData> {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (result: QueryResult<T>) => void) => void;
}

// Supabase Query Builder Mock
const createQueryBuilder = <T extends MockData>(
  data: T[],
  error: { message: string } | null = null
): QueryBuilder<T> => {
  let filteredData = [...data];
  let selectedFields: string | null = null;

  const builder: QueryBuilder<T> = {
    select: vi.fn((fields = "*") => {
      selectedFields = fields;
      return builder;
    }),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      filteredData = filteredData.filter(
        (item) => (item as Record<string, unknown>)[column] === value
      );
      return builder;
    }),
    neq: vi.fn((column: string, value: unknown) => {
      filteredData = filteredData.filter(
        (item) => (item as Record<string, unknown>)[column] !== value
      );
      return builder;
    }),
    gt: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    like: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn((n: number) => {
      filteredData = filteredData.slice(0, n);
      return builder;
    }),
    range: vi.fn((start: number, end: number) => {
      filteredData = filteredData.slice(start, end + 1);
      return builder;
    }),
    single: vi.fn(() => {
      return Promise.resolve({
        data: filteredData[0] || null,
        error: filteredData.length === 0 ? { message: "Not found" } : error,
      });
    }),
    maybeSingle: vi.fn(() => {
      return Promise.resolve({
        data: filteredData[0] || null,
        error,
      });
    }),
    then: (resolve: (result: QueryResult<T>) => void) => {
      resolve({ data: filteredData, error, count: filteredData.length });
    },
  };

  return builder;
};

// Create mock Supabase client
export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn((table: string) => {
    switch (table) {
      case "cameras":
        return createQueryBuilder(mockCameraData);
      case "alerts":
        return createQueryBuilder(mockAlertData);
      case "rules":
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
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: "user-1", email: "test@test.com" } },
        error: null,
      })
    ),
    getSession: vi.fn(() =>
      Promise.resolve({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      })
    ),
    signInWithPassword: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: "user-1" } },
        error: null,
      })
    ),
    signUp: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: "user-1" } },
        error: null,
      })
    ),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
      callback("SIGNED_IN", { user: { id: "user-1" } });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };

  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn(() =>
        Promise.resolve({ data: { path: "test.jpg" }, error: null })
      ),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: "https://example.com/test.jpg" },
      })),
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
vi.mock("@/integrations/supabase/client", () => ({
  supabase: createMockSupabaseClient(),
}));

