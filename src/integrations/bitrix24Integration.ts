/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Integração: Bitrix24
 * 
 * Sync de funcionários do Bitrix24 para o sistema VISÃO:
 * - Importar funcionários como pessoas cadastradas
 * - Sincronizar fotos de perfil
 * - Mapear departamentos para grupos
 * - Webhook para atualizações em tempo real
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// TIPOS
// ============================================

interface Bitrix24Config {
  webhookUrl: string;
  syncInterval: number; // minutos
  autoSync: boolean;
  syncPhotos: boolean;
  defaultListType: 'whitelist' | 'employee' | 'visitor';
  departmentMapping: Record<string, string>; // Bitrix dept ID -> VISÃO group
}

interface Bitrix24Employee {
  ID: string;
  NAME: string;
  LAST_NAME: string;
  SECOND_NAME?: string;
  EMAIL?: string;
  PERSONAL_PHONE?: string;
  WORK_PHONE?: string;
  PERSONAL_PHOTO?: string;
  UF_DEPARTMENT?: number[];
  WORK_POSITION?: string;
  ACTIVE: boolean;
  DATE_REGISTER?: string;
  LAST_LOGIN?: string;
}

interface Bitrix24Department {
  ID: string;
  NAME: string;
  PARENT?: string;
  SORT?: number;
  UF_HEAD?: string;
}

interface SyncResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  timestamp: Date;
}

interface PersonToSync {
  bitrix_id: string;
  name: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  department?: string;
  position?: string;
  list_type: string;
  role: string;
  metadata: Record<string, any>;
}

// ============================================
// CLIENTE BITRIX24
// ============================================

class Bitrix24Client {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl.replace(/\/$/, ''); // Remover trailing slash
  }

  /**
   * Fazer requisição à API do Bitrix24
   */
  private async request<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    const url = `${this.webhookUrl}/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Bitrix24 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Bitrix24 error: ${data.error_description || data.error}`);
    }

    return data.result;
  }

  /**
   * Listar todos os funcionários
   */
  async getEmployees(activeOnly: boolean = true): Promise<Bitrix24Employee[]> {
    const allEmployees: Bitrix24Employee[] = [];
    let start = 0;
    
    while (true) {
      const result = await this.request<Bitrix24Employee[]>('user.get', {
        FILTER: activeOnly ? { ACTIVE: 'Y' } : {},
        start,
      });

      if (!result || result.length === 0) {
        break;
      }

      allEmployees.push(...result);
      
      if (result.length < 50) {
        break; // Última página
      }
      
      start += 50;
    }

    return allEmployees;
  }

  /**
   * Buscar funcionário por ID
   */
  async getEmployee(id: string): Promise<Bitrix24Employee | null> {
    const result = await this.request<Bitrix24Employee[]>('user.get', {
      ID: id,
    });
    
    return result?.[0] || null;
  }

  /**
   * Listar departamentos
   */
  async getDepartments(): Promise<Bitrix24Department[]> {
    return this.request<Bitrix24Department[]>('department.get');
  }

  /**
   * Buscar departamento por ID
   */
  async getDepartment(id: string): Promise<Bitrix24Department | null> {
    const result = await this.request<Bitrix24Department[]>('department.get', {
      ID: id,
    });
    
    return result?.[0] || null;
  }

  /**
   * Verificar conexão
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('profile');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// SERVIÇO DE SINCRONIZAÇÃO
// ============================================

class Bitrix24SyncService {
  private client: Bitrix24Client;
  private config: Bitrix24Config;

  constructor(config: Bitrix24Config) {
    this.config = config;
    this.client = new Bitrix24Client(config.webhookUrl);
  }

  /**
   * Sincronizar funcionários
   */
  async syncEmployees(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Buscar funcionários do Bitrix24
      const employees = await this.client.getEmployees(true);
      result.totalProcessed = employees.length;

      // Buscar departamentos para mapeamento
      const departments = await this.client.getDepartments();
      const deptMap = new Map(departments.map(d => [d.ID, d.NAME]));

      // Processar cada funcionário
      for (const employee of employees) {
        try {
          const personData = this.mapEmployeeToPerson(employee, deptMap);
          const syncResult = await this.syncPerson(personData);
          
          if (syncResult === 'created') result.created++;
          else if (syncResult === 'updated') result.updated++;
          else result.skipped++;
          
        } catch (error) {
          result.errors.push(`Erro ao sincronizar ${employee.NAME}: ${error}`);
        }
      }

      // Registrar log de sync
      await this.logSync(result);
      
      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Erro geral: ${error}`);
    }

    return result;
  }

  /**
   * Mapear funcionário Bitrix24 para pessoa do VISÃO
   */
  private mapEmployeeToPerson(
    employee: Bitrix24Employee, 
    deptMap: Map<string, string>
  ): PersonToSync {
    // Construir nome completo
    const nameParts = [employee.NAME, employee.SECOND_NAME, employee.LAST_NAME]
      .filter(Boolean);
    const fullName = nameParts.join(' ');

    // Obter departamento
    const deptId = employee.UF_DEPARTMENT?.[0]?.toString();
    const department = deptId ? deptMap.get(deptId) : undefined;

    // Mapear para grupo do VISÃO
    const mappedGroup = deptId ? this.config.departmentMapping[deptId] : undefined;

    return {
      bitrix_id: employee.ID,
      name: fullName,
      email: employee.EMAIL,
      phone: employee.PERSONAL_PHONE || employee.WORK_PHONE,
      photo_url: this.config.syncPhotos ? employee.PERSONAL_PHOTO : undefined,
      department,
      position: employee.WORK_POSITION,
      list_type: mappedGroup || this.config.defaultListType,
      role: employee.WORK_POSITION || 'Funcionário',
      metadata: {
        bitrix_id: employee.ID,
        bitrix_active: employee.ACTIVE,
        bitrix_department_id: deptId,
        last_login: employee.LAST_LOGIN,
        synced_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Sincronizar pessoa individual
   */
  private async syncPerson(person: PersonToSync): Promise<'created' | 'updated' | 'skipped'> {
    // Verificar se já existe pelo bitrix_id
    const { data: existing } = await supabase
      .from('registered_persons')
      .select('id, metadata')
      .eq('metadata->>bitrix_id', person.bitrix_id)
      .maybeSingle();

    if (existing) {
      // Atualizar
      const { error } = await supabase
        .from('registered_persons')
        .update({
          name: person.name,
          email: person.email,
          phone: person.phone,
          role: person.role,
          list_type: person.list_type,
          notes: person.position,
          metadata: person.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
      
      // Sync foto se necessário
      if (person.photo_url) {
        await this.syncPhoto(existing.id, person.photo_url);
      }

      return 'updated';
    }

    // Criar novo
    const { data: created, error } = await supabase
      .from('registered_persons')
      .insert({
        name: person.name,
        email: person.email,
        phone: person.phone,
        role: person.role,
        list_type: person.list_type,
        notes: person.position,
        metadata: person.metadata,
      })
      .select()
      .single();

    if (error) throw error;

    // Sync foto
    if (person.photo_url && created) {
      await this.syncPhoto(created.id, person.photo_url);
    }

    return 'created';
  }

  /**
   * Sincronizar foto do funcionário
   */
  private async syncPhoto(personId: string, photoUrl: string): Promise<void> {
    try {
      // Baixar foto do Bitrix24
      const response = await fetch(photoUrl);
      if (!response.ok) return;

      const blob = await response.blob();

      // Upload para Supabase Storage
      const fileName = `${personId}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('face-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('face-photos')
        .getPublicUrl(fileName);

      // Atualizar pessoa com URL da foto
      await supabase
        .from('registered_persons')
        .update({ photo_url: urlData?.publicUrl })
        .eq('id', personId);

    } catch (error) {
      console.error('Erro ao sincronizar foto:', error);
    }
  }

  /**
   * Registrar log de sincronização
   */
  private async logSync(result: SyncResult): Promise<void> {
    try {
      await supabase
        .from('sync_logs')
        .insert({
          source: 'bitrix24',
          result: result.success ? 'success' : 'error',
          total_processed: result.totalProcessed,
          created_count: result.created,
          updated_count: result.updated,
          skipped_count: result.skipped,
          errors: result.errors,
          synced_at: result.timestamp.toISOString(),
        });
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  }

  /**
   * Testar conexão
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }
}

// ============================================
// HOOK REACT
// ============================================

import { useState, useCallback, useEffect } from 'react';

interface UseBitrix24SyncOptions {
  webhookUrl: string;
  autoSync?: boolean;
  syncInterval?: number; // minutos
  onSyncComplete?: (result: SyncResult) => void;
  onError?: (error: Error) => void;
}

interface UseBitrix24SyncReturn {
  // Estado
  isConnected: boolean;
  isSyncing: boolean;
  lastSync: SyncResult | null;
  
  // Ações
  testConnection: () => Promise<boolean>;
  syncNow: () => Promise<SyncResult>;
  
  // Config
  config: Bitrix24Config;
  updateConfig: (updates: Partial<Bitrix24Config>) => void;
}

export function useBitrix24Sync(options: UseBitrix24SyncOptions): UseBitrix24SyncReturn {
  const {
    webhookUrl,
    autoSync = false,
    syncInterval = 60,
    onSyncComplete,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [config, setConfig] = useState<Bitrix24Config>({
    webhookUrl,
    syncInterval,
    autoSync,
    syncPhotos: true,
    defaultListType: 'employee',
    departmentMapping: {},
  });

  // Testar conexão
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const service = new Bitrix24SyncService(config);
      const connected = await service.testConnection();
      setIsConnected(connected);
      return connected;
    } catch (error) {
      setIsConnected(false);
      onError?.(error as Error);
      return false;
    }
  }, [config, onError]);

  // Sincronizar
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (isSyncing) {
      return {
        success: false,
        totalProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: ['Sincronização já em andamento'],
        timestamp: new Date(),
      };
    }

    setIsSyncing(true);

    try {
      const service = new Bitrix24SyncService(config);
      const result = await service.syncEmployees();
      
      setLastSync(result);
      onSyncComplete?.(result);
      
      return result;

    } catch (error) {
      const result: SyncResult = {
        success: false,
        totalProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [(error as Error).message],
        timestamp: new Date(),
      };
      
      setLastSync(result);
      onError?.(error as Error);
      
      return result;

    } finally {
      setIsSyncing(false);
    }
  }, [config, isSyncing, onSyncComplete, onError]);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<Bitrix24Config>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Auto-sync
  useEffect(() => {
    if (!config.autoSync || !isConnected) return;

    const interval = setInterval(() => {
      syncNow();
    }, config.syncInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [config.autoSync, config.syncInterval, isConnected, syncNow]);

  // Testar conexão inicial
  useEffect(() => {
    if (webhookUrl) {
      testConnection();
    }
  }, [webhookUrl, testConnection]);

  return {
    isConnected,
    isSyncing,
    lastSync,
    testConnection,
    syncNow,
    config,
    updateConfig,
  };
}

// ============================================
// EXPORTS
// ============================================

export { Bitrix24Client, Bitrix24SyncService };
export type { 
  Bitrix24Config, 
  Bitrix24Employee, 
  Bitrix24Department, 
  SyncResult 
};
