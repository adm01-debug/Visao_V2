// Wave 39 — Guarda de baseline de saúde do banco.
// Avalia snapshot do MCP (JSON aderente a db_health) contra thresholds
// e devolve alertas classificados. NÃO consulta o banco em runtime — é
// invocado manualmente ou por CI com um snapshot capturado.

export type HealthSnapshot = {
  database: 'up' | 'down';
  pgbouncer: 'up' | 'down';
  memoryPct: number; // 0-100
  dataDiskPct: number; // 0-100
  connectionsUsed: number;
  connectionsMax: number;
  poolUsed: number;
  poolMax: number;
  walMB: number;
  rolledBack: number;
  restarts: number;
};

export type HealthAlert = {
  level: 'critical' | 'warning' | 'info';
  metric: string;
  message: string;
};

export const HEALTH_THRESHOLDS = {
  memoryWarn: 70,
  memoryCrit: 85,
  diskWarn: 70,
  diskCrit: 85,
  connWarn: 0.7,
  connCrit: 0.9,
  poolWarn: 0.7,
  poolCrit: 0.9,
  walWarnMB: 512,
  walCritMB: 1024,
} as const;

export function evaluateHealth(s: HealthSnapshot): HealthAlert[] {
  const alerts: HealthAlert[] = [];

  if (s.database !== 'up')
    alerts.push({ level: 'critical', metric: 'database', message: 'Banco de dados fora do ar' });
  if (s.pgbouncer !== 'up')
    alerts.push({ level: 'critical', metric: 'pgbouncer', message: 'PgBouncer fora do ar' });
  if (s.restarts > 0)
    alerts.push({
      level: 'warning',
      metric: 'restarts',
      message: `Banco reiniciou ${s.restarts}× desde boot`,
    });

  if (s.memoryPct >= HEALTH_THRESHOLDS.memoryCrit)
    alerts.push({
      level: 'critical',
      metric: 'memory',
      message: `Memória em ${s.memoryPct}% (>= ${HEALTH_THRESHOLDS.memoryCrit}%)`,
    });
  else if (s.memoryPct >= HEALTH_THRESHOLDS.memoryWarn)
    alerts.push({ level: 'warning', metric: 'memory', message: `Memória em ${s.memoryPct}%` });

  if (s.dataDiskPct >= HEALTH_THRESHOLDS.diskCrit)
    alerts.push({ level: 'critical', metric: 'disk', message: `Disco em ${s.dataDiskPct}%` });
  else if (s.dataDiskPct >= HEALTH_THRESHOLDS.diskWarn)
    alerts.push({ level: 'warning', metric: 'disk', message: `Disco em ${s.dataDiskPct}%` });

  const connRatio = s.connectionsMax > 0 ? s.connectionsUsed / s.connectionsMax : 0;
  if (connRatio >= HEALTH_THRESHOLDS.connCrit)
    alerts.push({
      level: 'critical',
      metric: 'connections',
      message: `Conexões ${s.connectionsUsed}/${s.connectionsMax}`,
    });
  else if (connRatio >= HEALTH_THRESHOLDS.connWarn)
    alerts.push({
      level: 'warning',
      metric: 'connections',
      message: `Conexões ${s.connectionsUsed}/${s.connectionsMax}`,
    });

  const poolRatio = s.poolMax > 0 ? s.poolUsed / s.poolMax : 0;
  if (poolRatio >= HEALTH_THRESHOLDS.poolCrit)
    alerts.push({ level: 'critical', metric: 'pool', message: `Pool ${s.poolUsed}/${s.poolMax}` });
  else if (poolRatio >= HEALTH_THRESHOLDS.poolWarn)
    alerts.push({ level: 'warning', metric: 'pool', message: `Pool ${s.poolUsed}/${s.poolMax}` });

  if (s.walMB >= HEALTH_THRESHOLDS.walCritMB)
    alerts.push({ level: 'critical', metric: 'wal', message: `WAL em ${s.walMB} MB` });
  else if (s.walMB >= HEALTH_THRESHOLDS.walWarnMB)
    alerts.push({ level: 'warning', metric: 'wal', message: `WAL em ${s.walMB} MB` });

  if (alerts.length === 0)
    alerts.push({
      level: 'info',
      metric: 'overall',
      message: 'Saúde OK — todos os indicadores dentro do baseline',
    });
  return alerts;
}
