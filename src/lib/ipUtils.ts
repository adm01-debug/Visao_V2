/**
 * IP Utilities
 * Funções utilitárias para manipulação e validação de IPs
 */

// Validar formato de IP v4
export const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.').map(Number);
  return parts.every(part => part >= 0 && part <= 255);
};

// Validar formato de IP v6
export const isValidIPv6 = (ip: string): boolean => {
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:([0-9a-fA-F]{1,4}:){1,7}$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
};

// Verificar se é localhost
export const isLocalhost = (ip: string): boolean => {
  const localhostIPs = ['127.0.0.1', '::1', 'localhost', '0.0.0.0'];
  return localhostIPs.includes(ip.toLowerCase());
};

// Verificar se é IP privado
export const isPrivateIP = (ip: string): boolean => {
  if (!isValidIPv4(ip)) return false;
  
  const parts = ip.split('.').map(Number);
  
  // 10.0.0.0 - 10.255.255.255
  if (parts[0] === 10) return true;
  
  // 172.16.0.0 - 172.31.255.255
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.0.0 - 192.168.255.255
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  // 169.254.0.0 - 169.254.255.255 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  
  return false;
};

// Converter IP para número (para comparação de ranges)
export const ipToNumber = (ip: string): number => {
  if (!isValidIPv4(ip)) return 0;
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

// Verificar se IP está em um range CIDR
export const isIPInCIDR = (ip: string, cidr: string): boolean => {
  if (!isValidIPv4(ip)) return false;
  
  const [rangeIP, bits] = cidr.split('/');
  if (!isValidIPv4(rangeIP)) return false;
  
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(rangeIP);
  
  return (ipNum & mask) === (rangeNum & mask);
};

// Verificar se IP está em uma lista de ranges
export const isIPInRanges = (ip: string, ranges: string[]): boolean => {
  return ranges.some(range => {
    if (range.includes('/')) {
      return isIPInCIDR(ip, range);
    }
    return ip === range;
  });
};

// Obter IP do cliente (considera proxies)
export const getClientIP = (request?: Request): string => {
  if (!request) {
    // Fallback para navegador
    return 'unknown';
  }
  
  // Headers comuns de proxy
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'true-client-ip',
    'x-cluster-client-ip',
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for pode ter múltiplos IPs
      const ip = value.split(',')[0].trim();
      if (isValidIPv4(ip) || isValidIPv6(ip)) {
        return ip;
      }
    }
  }
  
  return 'unknown';
};

// Mascarar IP para logs (privacidade)
export const maskIP = (ip: string): string => {
  if (!isValidIPv4(ip)) return ip;
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.xxx.xxx`;
};

// Gerar hash do IP (para tracking anônimo)
export const hashIP = async (ip: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'visao-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};
