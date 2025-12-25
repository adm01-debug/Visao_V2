/**
 * IP Whitelist Middleware
 * Middleware para restringir acesso apenas a IPs autorizados
 */

import { 
  IP_WHITELIST_CONFIG, 
  PRODUCTION_WHITELIST, 
  ADMIN_IPS,
  IP_MESSAGES,
  type IPWhitelistConfig 
} from '@/config/ipWhitelist';
import { 
  isLocalhost, 
  isPrivateIP, 
  isIPInRanges, 
  getClientIP,
  maskIP,
  isValidIPv4 
} from '@/lib/ipUtils';
import { logger } from '@/lib/logger';

export interface IPCheckResult {
  allowed: boolean;
  reason: string;
  ip: string;
  isAdmin: boolean;
}

// Verificar se IP está na whitelist
export const checkIPWhitelist = (
  ip: string, 
  config: IPWhitelistConfig = IP_WHITELIST_CONFIG
): IPCheckResult => {
  const result: IPCheckResult = {
    allowed: false,
    reason: IP_MESSAGES.blocked,
    ip,
    isAdmin: false,
  };

  // Se whitelist está desabilitada, permite tudo
  if (!config.enabled) {
    result.allowed = true;
    result.reason = 'Whitelist disabled';
    return result;
  }

  // Verificar se IP está explicitamente bloqueado
  if (config.blockedIPs.includes(ip)) {
    result.reason = IP_MESSAGES.blockedExplicit;
    logAccessAttempt(ip, false, 'Blocked IP');
    return result;
  }

  // Verificar se é admin (acesso total)
  if (ADMIN_IPS.includes(ip)) {
    result.allowed = true;
    result.isAdmin = true;
    result.reason = 'Admin IP';
    return result;
  }

  // Verificar localhost
  if (config.allowLocalhost && isLocalhost(ip)) {
    result.allowed = true;
    result.reason = 'Localhost allowed';
    return result;
  }

  // Verificar redes privadas
  if (config.allowPrivateNetworks && isPrivateIP(ip)) {
    result.allowed = true;
    result.reason = 'Private network allowed';
    return result;
  }

  // Verificar IPs específicos na whitelist
  if (config.trustedIPs.includes(ip)) {
    result.allowed = true;
    result.reason = 'Trusted IP';
    return result;
  }

  // Verificar ranges CIDR
  if (isIPInRanges(ip, config.trustedRanges)) {
    result.allowed = true;
    result.reason = 'IP in trusted range';
    return result;
  }

  // Verificar lista de produção
  if (PRODUCTION_WHITELIST.includes(ip) || isIPInRanges(ip, PRODUCTION_WHITELIST)) {
    result.allowed = true;
    result.reason = 'Production whitelist';
    return result;
  }

  // IP não autorizado
  if (config.logAttempts) {
    logAccessAttempt(ip, false, 'Not in whitelist');
  }

  return result;
};

// Middleware para Express/Node
export const ipWhitelistMiddleware = (
  config: IPWhitelistConfig = IP_WHITELIST_CONFIG
) => {
  return (request: Request): Response | null => {
    const ip = getClientIP(request);
    const result = checkIPWhitelist(ip, config);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Access Denied',
          message: result.reason,
          contact: IP_MESSAGES.contactAdmin,
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Access-Denied-Reason': 'IP not whitelisted',
          },
        }
      );
    }

    return null; // Permite continuar
  };
};

// Registrar tentativa de acesso
const logAccessAttempt = (ip: string, allowed: boolean, reason: string): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    ip: maskIP(ip),
    allowed,
    reason,
  };

  if (allowed) {
    logger.info('IP Access Granted', logData);
  } else {
    logger.warn('IP Access Denied', logData);
  }
};

// Hook para React - verificar IP no cliente
export const useIPCheck = () => {
  const checkAccess = async (): Promise<IPCheckResult> => {
    try {
      // Chamar API para verificar IP
      const response = await fetch('/api/check-ip');
      const data = await response.json();
      return data;
    } catch {
      return {
        allowed: false,
        reason: 'Unable to verify IP',
        ip: 'unknown',
        isAdmin: false,
      };
    }
  };

  return { checkAccess };
};

// Adicionar IP dinamicamente à whitelist
export const addToWhitelist = (ip: string): boolean => {
  if (!isValidIPv4(ip)) return false;
  
  if (!IP_WHITELIST_CONFIG.trustedIPs.includes(ip)) {
    IP_WHITELIST_CONFIG.trustedIPs.push(ip);
    logger.info('IP added to whitelist', { ip: maskIP(ip) });
    return true;
  }
  return false;
};

// Remover IP da whitelist
export const removeFromWhitelist = (ip: string): boolean => {
  const index = IP_WHITELIST_CONFIG.trustedIPs.indexOf(ip);
  if (index > -1) {
    IP_WHITELIST_CONFIG.trustedIPs.splice(index, 1);
    logger.info('IP removed from whitelist', { ip: maskIP(ip) });
    return true;
  }
  return false;
};

// Bloquear IP
export const blockIP = (ip: string): boolean => {
  if (!isValidIPv4(ip)) return false;
  
  if (!IP_WHITELIST_CONFIG.blockedIPs.includes(ip)) {
    IP_WHITELIST_CONFIG.blockedIPs.push(ip);
    logger.warn('IP blocked', { ip: maskIP(ip) });
    return true;
  }
  return false;
};

// Desbloquear IP
export const unblockIP = (ip: string): boolean => {
  const index = IP_WHITELIST_CONFIG.blockedIPs.indexOf(ip);
  if (index > -1) {
    IP_WHITELIST_CONFIG.blockedIPs.splice(index, 1);
    logger.info('IP unblocked', { ip: maskIP(ip) });
    return true;
  }
  return false;
};
