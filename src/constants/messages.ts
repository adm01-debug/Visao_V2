/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Messages Constants - Mensagens do sistema
 * 
 * @module constants/messages
 */

// ============================================
// TIPOS
// ============================================

export type MessageCategory = 'SUCCESS' | 'ERROR' | 'VALIDATION' | 'INFO' | 'WARNING';
export type Messages = typeof MESSAGES;

// ============================================
// MENSAGENS DE SUCESSO
// ============================================

export const SUCCESS_MESSAGES = {
  // Autenticação
  LOGIN: 'Login realizado com sucesso!',
  LOGOUT: 'Logout realizado com sucesso!',
  REGISTER: 'Cadastro realizado com sucesso! Verifique seu email.',
  PASSWORD_RESET: 'Senha redefinida com sucesso!',
  PASSWORD_CHANGED: 'Senha alterada com sucesso!',
  EMAIL_VERIFIED: 'Email verificado com sucesso!',
  
  // CRUD Genérico
  SAVE: 'Salvo com sucesso!',
  CREATE: 'Criado com sucesso!',
  UPDATE: 'Atualizado com sucesso!',
  DELETE: 'Removido com sucesso!',
  
  // Câmeras
  CAMERA_CREATED: 'Câmera adicionada com sucesso!',
  CAMERA_UPDATED: 'Câmera atualizada com sucesso!',
  CAMERA_DELETED: 'Câmera removida com sucesso!',
  CAMERA_CONNECTED: 'Câmera conectada!',
  
  // Alertas
  ALERT_ACKNOWLEDGED: 'Alerta reconhecido!',
  ALERT_RESOLVED: 'Alerta resolvido!',
  ALERT_DISMISSED: 'Alerta descartado!',
  
  // Zonas
  ZONE_CREATED: 'Zona criada com sucesso!',
  ZONE_UPDATED: 'Zona atualizada com sucesso!',
  ZONE_DELETED: 'Zona removida com sucesso!',
  
  // Configurações
  SETTINGS_SAVED: 'Configurações salvas com sucesso!',
  
  // Relatórios
  REPORT_GENERATED: 'Relatório gerado com sucesso!',
  EXPORT_COMPLETED: 'Exportação concluída!',
} as const;

// ============================================
// MENSAGENS DE ERRO
// ============================================

export const ERROR_MESSAGES = {
  // Genéricos
  GENERIC: 'Ocorreu um erro. Tente novamente.',
  UNKNOWN: 'Erro desconhecido. Contate o suporte.',
  TIMEOUT: 'A operação demorou muito. Tente novamente.',
  
  // Rede
  NETWORK: 'Erro de conexão. Verifique sua internet.',
  SERVER: 'Erro no servidor. Tente novamente mais tarde.',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível.',
  
  // Autenticação
  UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
  FORBIDDEN: 'Você não tem permissão para esta ação.',
  INVALID_CREDENTIALS: 'Email ou senha incorretos.',
  ACCOUNT_DISABLED: 'Conta desativada. Contate o administrador.',
  
  // Recursos
  NOT_FOUND: 'Recurso não encontrado.',
  ALREADY_EXISTS: 'Este item já existe.',
  CONFLICT: 'Conflito de dados. Atualize a página.',
  
  // Câmeras
  CAMERA_OFFLINE: 'Câmera offline ou inacessível.',
  CAMERA_CONNECTION_FAILED: 'Falha ao conectar à câmera.',
  STREAM_ERROR: 'Erro ao carregar stream.',
  
  // Upload
  FILE_TOO_LARGE: 'Arquivo muito grande. Máximo: 10MB.',
  INVALID_FILE_TYPE: 'Tipo de arquivo não suportado.',
  UPLOAD_FAILED: 'Falha no upload. Tente novamente.',
} as const;

// ============================================
// MENSAGENS DE VALIDAÇÃO
// ============================================

export const VALIDATION_MESSAGES = {
  // Campos obrigatórios
  REQUIRED: 'Este campo é obrigatório.',
  REQUIRED_FIELD: (field: string) => `${field} é obrigatório.`,
  
  // Email
  EMAIL_INVALID: 'Email inválido.',
  EMAIL_IN_USE: 'Este email já está em uso.',
  
  // Senha
  PASSWORD_WEAK: 'Senha muito fraca. Use letras, números e símbolos.',
  PASSWORD_SHORT: 'Senha deve ter no mínimo 8 caracteres.',
  PASSWORD_MISMATCH: 'As senhas não coincidem.',
  
  // Números
  NUMBER_INVALID: 'Valor numérico inválido.',
  NUMBER_MIN: (min: number) => `Valor mínimo: ${min}.`,
  NUMBER_MAX: (max: number) => `Valor máximo: ${max}.`,
  NUMBER_RANGE: (min: number, max: number) => `Valor deve estar entre ${min} e ${max}.`,
  
  // Texto
  TEXT_TOO_SHORT: (min: number) => `Mínimo de ${min} caracteres.`,
  TEXT_TOO_LONG: (max: number) => `Máximo de ${max} caracteres.`,
  
  // URL
  URL_INVALID: 'URL inválida.',
  
  // Data
  DATE_INVALID: 'Data inválida.',
  DATE_PAST: 'Data não pode ser no passado.',
  DATE_FUTURE: 'Data não pode ser no futuro.',
} as const;

// ============================================
// MENSAGENS INFORMATIVAS
// ============================================

export const INFO_MESSAGES = {
  LOADING: 'Carregando...',
  PROCESSING: 'Processando...',
  SAVING: 'Salvando...',
  PLEASE_WAIT: 'Por favor, aguarde...',
  NO_DATA: 'Nenhum dado encontrado.',
  NO_RESULTS: 'Nenhum resultado encontrado.',
  CONFIRM_DELETE: 'Tem certeza que deseja excluir?',
  CONFIRM_ACTION: 'Confirma esta ação?',
  SESSION_EXPIRING: 'Sua sessão expirará em breve.',
} as const;

// ============================================
// MENSAGENS DE AVISO
// ============================================

export const WARNING_MESSAGES = {
  UNSAVED_CHANGES: 'Você tem alterações não salvas.',
  CAMERA_DISCONNECTED: 'Câmera desconectada.',
  LOW_STORAGE: 'Espaço de armazenamento baixo.',
  HIGH_CPU: 'Alto uso de CPU detectado.',
  RATE_LIMITED: 'Muitas requisições. Aguarde um momento.',
} as const;

// ============================================
// EXPORT CONSOLIDADO
// ============================================

export const MESSAGES = {
  SUCCESS: SUCCESS_MESSAGES,
  ERROR: ERROR_MESSAGES,
  VALIDATION: VALIDATION_MESSAGES,
  INFO: INFO_MESSAGES,
  WARNING: WARNING_MESSAGES,
} as const;

export default MESSAGES;
