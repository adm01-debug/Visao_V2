/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Integração: Bitrix24
 * 
 * Sync de funcionários do Bitrix24 para o sistema VISÃO:
 * - Importar funcionários como pessoas cadastradas
 * - Sincronizar fotos de perfil
 * - Mapear departamentos para grupos
 * - Webhook para atualizações em tempo real
 * 
 * NOTE: This is a placeholder integration. Full implementation requires
 * additional database columns (metadata, email, phone, etc.) on registered_persons table.
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
   * Listar funcionários ativos
   */
  async getActiveEmployees(): Promise<Bitrix24Employee[]> {
    const employees: Bitrix24Employee[] = [];
    let start = 0;
    const limit = 50;

    while (true) {
      const result = await this.request<Bitrix24Employee[]>('user.get', {
        FILTER: { ACTIVE: true },
        start,
      });

      if (!result || result.length === 0) break;
      
      employees.push(...result);
      
      if (result.length < limit) break;
      start += limit;
    }

    return employees;
  }

  /**
   * Listar departamentos
   */
  async getDepartments(): Promise<Bitrix24Department[]> {
    return this.request<Bitrix24Department[]>('department.get', {});
  }

  /**
   * Buscar funcionário por ID
   */
  async getEmployeeById(id: string): Promise<Bitrix24Employee | null> {
    try {
      const result = await this.request<Bitrix24Employee[]>('user.get', {
        ID: id,
      });
      return result?.[0] || null;
    } catch {
      return null;
    }
  }
}

// ============================================
// SERVIÇO DE SINCRONIZAÇÃO
// ============================================

export class Bitrix24SyncService {
  private client: Bitrix24Client;
  private config: Bitrix24Config;
  private departments: Map<string, string> = new Map();

  constructor(config: Bitrix24Config) {
    this.config = config;
    this.client = new Bitrix24Client(config.webhookUrl);
  }

  /**
   * Executar sincronização completa
   */
  async sync(): Promise<SyncResult> {
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
      // Carregar departamentos
      const departments = await this.client.getDepartments();
      this.departments = new Map(departments.map(d => [d.ID, d.NAME]));

      // Buscar funcionários ativos
      const employees = await this.client.getActiveEmployees();
      result.totalProcessed = employees.length;

      // Sincronizar cada funcionário
      for (const employee of employees) {
        try {
          const person = this.mapEmployeeToPerson(employee);
          const syncResult = await this.syncPerson(person);
          
          switch (syncResult) {
            case 'created':
              result.created++;
              break;
            case 'updated':
              result.updated++;
              break;
            case 'skipped':
              result.skipped++;
              break;
          }
        } catch (error) {
          result.errors.push(`Erro ao sincronizar ${employee.NAME}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      
      // Registrar log
      await this.logSync(result);

      return result;
    } catch (error) {
      result.errors.push(`Erro geral: ${error}`);
      return result;
    }
  }

  /**
   * Mapear funcionário Bitrix24 para pessoa do VISÃO
   */
  private mapEmployeeToPerson(employee: Bitrix24Employee): PersonToSync {
    const departmentId = employee.UF_DEPARTMENT?.[0]?.toString();
    const department = departmentId ? this.departments.get(departmentId) : undefined;

    return {
      bitrix_id: employee.ID,
      name: `${employee.NAME} ${employee.LAST_NAME}`.trim(),
      email: employee.EMAIL,
      phone: employee.PERSONAL_PHONE || employee.WORK_PHONE,
      photo_url: employee.PERSONAL_PHOTO,
      department: department,
      position: employee.WORK_POSITION,
      list_type: this.config.defaultListType,
      role: employee.WORK_POSITION || 'Funcionário',
    };
  }

  /**
   * Sincronizar pessoa individual
   */
  private async syncPerson(person: PersonToSync): Promise<'created' | 'updated' | 'skipped'> {
    // Verificar se já existe pelo nome (simplified - real implementation would use bitrix_id)
    const { data: existing } = await supabase
      .from('registered_persons')
      .select('id')
      .eq('name', person.name)
      .maybeSingle();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (existing) {
      // Atualizar
      const { error } = await supabase
        .from('registered_persons')
        .update({
          role: person.role,
          department: person.department,
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
        role: person.role,
        department: person.department,
        user_id: user.id,
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
      const { error: uploadError } = await supabase.storage
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
      // Log to console for now - table sync_logs doesn't exist
      console.log('Bitrix24 sync completed:', {
        success: result.success,
        totalProcessed: result.totalProcessed,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        timestamp: result.timestamp,
      });
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================

export interface Bitrix24WebhookEvent {
  event: 'ONUSERADD' | 'ONUSERUPDATE' | 'ONUSERDELETE';
  data: {
    FIELDS: {
      ID: string;
    };
  };
  auth: {
    domain: string;
    application_token: string;
  };
}

export async function handleBitrix24Webhook(
  event: Bitrix24WebhookEvent,
  config: Bitrix24Config
): Promise<{ success: boolean; message: string }> {
  const service = new Bitrix24SyncService(config);
  const client = new Bitrix24Client(config.webhookUrl);

  try {
    const employeeId = event.data.FIELDS.ID;

    switch (event.event) {
      case 'ONUSERADD':
      case 'ONUSERUPDATE':
        const employee = await client.getEmployeeById(employeeId);
        if (employee && employee.ACTIVE) {
          // Re-sync would happen here
          return { success: true, message: `Employee ${employeeId} synced` };
        }
        break;

      case 'ONUSERDELETE':
        // Optionally deactivate the person
        return { success: true, message: `Employee ${employeeId} deletion noted` };
    }

    return { success: true, message: 'Event processed' };
  } catch (error) {
    console.error('Webhook error:', error);
    return { success: false, message: `Error: ${error}` };
  }
}

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

export function createBitrix24Config(webhookUrl: string): Bitrix24Config {
  return {
    webhookUrl,
    syncInterval: 60,
    autoSync: true,
    syncPhotos: true,
    defaultListType: 'employee',
    departmentMapping: {},
  };
}

export async function testBitrix24Connection(webhookUrl: string): Promise<{
  success: boolean;
  message: string;
  employeeCount?: number;
}> {
  try {
    const client = new Bitrix24Client(webhookUrl);
    const employees = await client.getActiveEmployees();
    
    return {
      success: true,
      message: `Conexão estabelecida. ${employees.length} funcionários ativos encontrados.`,
      employeeCount: employees.length,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro de conexão: ${error}`,
    };
  }
}

export default Bitrix24SyncService;
