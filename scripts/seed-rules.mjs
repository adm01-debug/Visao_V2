#!/usr/bin/env node
// Popula tabela rules via REST API com service_role.
// Resolve user_id do primeiro admin (preferência) ou primeiro user.
// Idempotente: checa por name antes do insert.

const SUPABASE_URL = 'https://pmzxbffnbenkmzpnbehb.supabase.co';
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtemhiZmZuYmVua216cG5iZWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE0NzE5MiwiZXhwIjoyMTAwNzIzMTkyfQ.LQGFHrkA4fh5FXULGhKfp7dDQaU-lnGRbRLpfkO8YxE';

const headers = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
};

const TEMPLATES = [
  {
    name: 'Detecção de Intrusos',
    description: 'Alerta quando movimento é detectado em áreas restritas fora do horário comercial',
    category: 'security',
    severity: 'critical',
    conditions: [
      { type: 'motion_detection', operator: 'equals', value: 1 },
      { type: 'restricted_area', operator: 'equals', value: 1 },
    ],
    actions: ['alert', 'notify', 'record'],
  },
  {
    name: 'Violação de Perímetro',
    description: 'Detecta quando alguém cruza o perímetro de segurança definido',
    category: 'security',
    severity: 'critical',
    conditions: [{ type: 'perimeter_breach', operator: 'equals', value: 1 }],
    actions: ['alert', 'notify', 'record', 'lockdown'],
  },
  {
    name: 'Permanência Suspeita',
    description: 'Alerta quando pessoa permanece em área por tempo prolongado',
    category: 'security',
    severity: 'high',
    conditions: [{ type: 'loitering', operator: 'greater_than', value: 300 }],
    actions: ['alert', 'notify'],
  },
  {
    name: 'Monitoramento de EPIs',
    description: 'Alerta quando trabalhadores não estão usando equipamentos de proteção',
    category: 'safety',
    severity: 'high',
    conditions: [{ type: 'no_ppe', operator: 'equals', value: 1 }],
    actions: ['alert', 'notify'],
  },
  {
    name: 'Aglomeração Perigosa',
    description: 'Detecta quando há muitas pessoas em área com limite de capacidade',
    category: 'safety',
    severity: 'high',
    conditions: [{ type: 'crowd_density', operator: 'greater_than', value: 80 }],
    actions: ['alert', 'notify'],
  },
  {
    name: 'Acesso Não Autorizado',
    description: 'Alerta quando pessoa não reconhecida tenta acessar área restrita',
    category: 'access',
    severity: 'critical',
    conditions: [
      { type: 'face_recognition', operator: 'equals', value: 0 },
      { type: 'restricted_area', operator: 'equals', value: 1 },
    ],
    actions: ['alert', 'notify', 'record', 'lockdown'],
  },
  {
    name: 'Limite de Capacidade',
    description: 'Alerta quando área atinge capacidade máxima definida',
    category: 'operations',
    severity: 'medium',
    conditions: [{ type: 'people_count', operator: 'greater_than', value: 50 }],
    actions: ['alert', 'notify'],
  },
  {
    name: 'Mudança de Cena',
    description: 'Detecta quando a câmera foi movida, obstruída ou adulterada',
    category: 'security',
    severity: 'critical',
    conditions: [{ type: 'scene_change', operator: 'equals', value: 1 }],
    actions: ['alert', 'notify', 'record'],
  },
];

async function main() {
  // 1. Já existem?
  const existing = await fetch(`${SUPABASE_URL}/rest/v1/rules?select=name`, { headers });
  const existingJson = await existing.json();
  const existingNames = new Set(
    (Array.isArray(existingJson) ? existingJson : []).map((r) => r.name),
  );
  console.log(`Regras existentes: ${existingNames.size}`);

  // 2. Pega user_id via user_roles (visível via REST API)
  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?role=eq.admin&select=user_id&limit=1`,
    { headers },
  );
  const admins = await adminRes.json();
  let userId;

  if (Array.isArray(admins) && admins.length > 0) {
    userId = admins[0].user_id;
    console.log(`Admin encontrado: ${userId}`);
  } else {
    // Fallback: user_roles de qualquer role
    const anyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?select=user_id&limit=1`,
      { headers },
    );
    const any = await anyRes.json();
    if (Array.isArray(any) && any.length > 0) {
      userId = any[0].user_id;
      console.log(`User fallback: ${userId}`);
    }
  }

  if (!userId) {
    throw new Error('Nenhum user com role encontrada — necessário para user_id');
  }

  // 3. Insert idempotente
  let inserted = 0;
  let skipped = 0;
  for (const t of TEMPLATES) {
    if (existingNames.has(t.name)) {
      console.log(`SKIP já existe: ${t.name}`);
      skipped++;
      continue;
    }

    const body = {
      name: t.name,
      description: t.description,
      category: t.category,
      severity: t.severity,
      conditions: t.conditions,
      actions: t.actions,
      cameras: [],
      is_active: true,
      user_id: userId,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rules`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`FAIL ${t.name}: ${res.status} ${err}`);
      continue;
    }

    const created = await res.json();
    console.log(`OK ${t.name} → ${created[0].id}`);
    inserted++;
  }

  console.log(`\nResultado: ${inserted} inseridas, ${skipped} já existiam`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
