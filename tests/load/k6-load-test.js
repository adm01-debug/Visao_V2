import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * VISÃO - Script de Teste de Carga (k6)
 * Focado em validar tempos de resposta (SLOs) para detecção de placas e rostos.
 */

export const options = {
  stages: [
    { duration: '1m', target: 20 }, // Warm-up: 20 usuários
    { duration: '3m', target: 50 }, // Estável: 50 usuários
    { duration: '1m', target: 0 }, // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições devem ser < 500ms
    http_req_failed: ['rate<0.01'], // Menos de 1% de falhas
  },
};

const BASE_URL = __ENV.SUPABASE_URL || 'https://pmzxbffnbenkmzpnbehb.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'REPLACE_ME';

export default function () {
  const params = {
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
  };

  // Teste de Ping / Health Check
  const resPing = http.get(`${BASE_URL}/rest/v1/profiles?limit=1`, params);
  check(resPing, {
    'status is 200': (r) => r.status === 200,
    'latency ok': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
