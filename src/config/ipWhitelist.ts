/**
 * IP Whitelist Configuration
 * Sistema de controle de acesso por IP
 * 
 * IMPORTANTE: Apenas IPs listados aqui terão acesso ao sistema
 */

export interface IPWhitelistConfig {
  enabled: boolean;
  allowLocalhost: boolean;
  allowPrivateNetworks: boolean;
  trustedIPs: string[];
  trustedRanges: string[];
  blockedIPs: string[];
  logAttempts: boolean;
  notifyOnBlock: boolean;
}

// IPs e ranges confiáveis padrão
export const IP_WHITELIST_CONFIG: IPWhitelistConfig = {
  // Ativar/desativar whitelist
  enabled: true,
  
  // Permitir localhost (desenvolvimento)
  allowLocalhost: import.meta.env.DEV,
  
  // Permitir redes privadas (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  allowPrivateNetworks: import.meta.env.DEV,
  
  // IPs específicos permitidos
  trustedIPs: [
    // Adicione IPs confiáveis aqui
    // '203.0.113.50',
    // '198.51.100.25',
  ],
  
  // Ranges de IP permitidos (CIDR notation)
  trustedRanges: [
    // Exemplo: '203.0.113.0/24' permite 203.0.113.0 - 203.0.113.255
    // '198.51.100.0/28' permite 198.51.100.0 - 198.51.100.15
  ],
  
  // IPs explicitamente bloqueados (têm prioridade sobre whitelist)
  blockedIPs: [],
  
  // Registrar tentativas de acesso
  logAttempts: true,
  
  // Notificar administrador em caso de bloqueio
  notifyOnBlock: true,
};

// Ambiente de produção - IPs específicos da empresa
export const PRODUCTION_WHITELIST: string[] = [
  // Escritório Principal
  // '203.0.113.50',
  
  // Filial
  // '198.51.100.25',
  
  // VPN Corporativa
  // '192.0.2.0/24',
  
  // Servidores de monitoramento
  // '198.51.100.100',
];

// IPs de administradores com acesso total
export const ADMIN_IPS: string[] = [
  // Super Admin
  // '203.0.113.1',
];

// Mensagens de erro personalizadas
export const IP_MESSAGES = {
  blocked: 'Acesso negado. Seu IP não está autorizado.',
  blockedExplicit: 'Acesso negado. Seu IP foi bloqueado.',
  unauthorized: 'Acesso não autorizado. Entre em contato com o administrador.',
  contactAdmin: 'Para solicitar acesso, entre em contato: admin@visao.app',
};
