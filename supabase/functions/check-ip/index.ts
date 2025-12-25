/**
 * Check IP Edge Function
 * Verifica se o IP do cliente está autorizado
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Configuração de IPs permitidos
const WHITELIST_ENABLED = true;
const ALLOW_LOCALHOST = Deno.env.get('ENVIRONMENT') === 'development';
const ALLOW_PRIVATE_NETWORKS = Deno.env.get('ENVIRONMENT') === 'development';

// IPs confiáveis (configure aqui ou via env)
const TRUSTED_IPS: string[] = (Deno.env.get('TRUSTED_IPS') || '').split(',').filter(Boolean);
const BLOCKED_IPS: string[] = (Deno.env.get('BLOCKED_IPS') || '').split(',').filter(Boolean);
const ADMIN_IPS: string[] = (Deno.env.get('ADMIN_IPS') || '').split(',').filter(Boolean);

// Funções auxiliares
const isLocalhost = (ip: string): boolean => {
  return ['127.0.0.1', '::1', 'localhost'].includes(ip);
};

const isPrivateIP = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  return false;
};

const getClientIP = (request: Request): string => {
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      return value.split(',')[0].trim();
    }
  }
  
  return 'unknown';
};

const checkIPAccess = (ip: string): { allowed: boolean; reason: string; isAdmin: boolean } => {
  // Se whitelist desabilitada
  if (!WHITELIST_ENABLED) {
    return { allowed: true, reason: 'Whitelist disabled', isAdmin: false };
  }

  // Verificar bloqueio explícito
  if (BLOCKED_IPS.includes(ip)) {
    return { allowed: false, reason: 'IP blocked', isAdmin: false };
  }

  // Verificar admin
  if (ADMIN_IPS.includes(ip)) {
    return { allowed: true, reason: 'Admin IP', isAdmin: true };
  }

  // Verificar localhost
  if (ALLOW_LOCALHOST && isLocalhost(ip)) {
    return { allowed: true, reason: 'Localhost', isAdmin: false };
  }

  // Verificar rede privada
  if (ALLOW_PRIVATE_NETWORKS && isPrivateIP(ip)) {
    return { allowed: true, reason: 'Private network', isAdmin: false };
  }

  // Verificar whitelist
  if (TRUSTED_IPS.includes(ip)) {
    return { allowed: true, reason: 'Trusted IP', isAdmin: false };
  }

  return { allowed: false, reason: 'IP not in whitelist', isAdmin: false };
};

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const clientIP = getClientIP(req);
    const result = checkIPAccess(clientIP);
    
    // Log da tentativa
    console.log(`IP Check: ${clientIP} - ${result.allowed ? 'ALLOWED' : 'DENIED'} - ${result.reason}`);

    return new Response(
      JSON.stringify({
        ip: clientIP,
        allowed: result.allowed,
        reason: result.reason,
        isAdmin: result.isAdmin,
        timestamp: new Date().toISOString(),
      }),
      {
        status: result.allowed ? 200 : 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('IP Check Error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        allowed: false,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
