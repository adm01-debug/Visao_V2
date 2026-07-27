#!/usr/bin/env node
/**
 * Onda 147 — Simulação do roteamento de alertas de manutenção por RESPONSÁVEL.
 *
 * Antes de escrever uma linha de SQL, este script materializa o algoritmo
 * pretendido como um modelo de referência e o submete a centenas de cenários
 * sintéticos, procurando os modos de falha que só aparecem em produção:
 * tempestade de retentativa, causa comum atrás de um switch, aborto de deploy
 * e amostra pobre.
 *
 * O modelo aqui é a ESPECIFICAÇÃO EXECUTÁVEL de `public.evaluate_blame_alerts`.
 * Se os dois divergirem, o gate `db:check:blame-routing` acusa.
 */

// ---------------------------------------------------------------------------
// Limiares — mesmos valores de public.blame_alert_thresholds()
// ---------------------------------------------------------------------------
export const THRESHOLDS = Object.freeze({
  windowMinutes: 60,
  /** Mínimo de ocorrências para um alerta localizado existir. */
  minRows: 3,
  /** A partir daqui o alerta localizado vira crítico. */
  criticalRows: 10,
  /** Câmeras distintas que caracterizam abrangência (deixa de ser localizado). */
  widespreadCameras: 3,
  /** Teto de alertas por execução: nenhuma rajada vira enxurrada de alertas. */
  maxAlertsPerRun: 12,
  cooldownWarningMinutes: 60,
  cooldownCriticalMinutes: 30,
});

/** Responsável por classe de culpa. `caller` não tem dono porque não há ação. */
export const BLAME_OWNER = Object.freeze({
  device: 'field_tech',
  transport: 'network_ops',
  config: 'registry_admin',
  cloud: 'platform',
  unknown: 'triage',
  caller: null,
});

/** Classes que jamais geram alerta: não existe ação humana correspondente. */
const SILENT_BLAMES = new Set(['caller']);

/** Classes cuja falha é intrinsecamente coletiva — nunca alerta por câmera. */
const FLEET_ONLY_BLAMES = new Set(['transport', 'cloud', 'unknown']);

/**
 * @typedef {{blame:string, camera_id:string|null, relay_agent_id:string|null,
 *            function_name:string, run_from:string}} Row
 */

/**
 * Modelo de referência. Recebe as linhas da janela e as chaves já em cooldown.
 * @param {Row[]} rows
 * @param {Set<string>} cooldownKeys chaves de rotina suprimidas por cooldown
 */
export function routeBlameAlerts(rows, cooldownKeys = new Set()) {
  const T = THRESHOLDS;
  const alerts = [];
  let suppressedCooldown = 0;
  let suppressedSample = 0;
  let suppressedSilent = 0;

  const actionable = rows.filter((r) => {
    if (SILENT_BLAMES.has(r.blame)) {
      suppressedSilent += 1;
      return false;
    }
    return BLAME_OWNER[r.blame] !== undefined && r.blame != null;
  });

  // --- Passo 1: causa comum. Muitas câmeras "mudas" atrás do MESMO agente não
  // são muitos equipamentos quebrados; é um caminho compartilhado quebrado.
  // Sem esta regra, um switch caído despacharia N técnicos a campo.
  const byAgent = new Map();
  for (const r of actionable) {
    if (r.blame !== 'device' || !r.relay_agent_id || !r.camera_id) continue;
    if (!byAgent.has(r.relay_agent_id)) byAgent.set(r.relay_agent_id, new Set());
    byAgent.get(r.relay_agent_id).add(r.camera_id);
  }
  /** Câmeras absorvidas pela causa comum — não podem gerar alerta individual. */
  const absorbed = new Set();
  const commonCause = [];
  for (const [agent, cams] of [...byAgent.entries()].sort()) {
    if (cams.size >= T.widespreadCameras) {
      for (const c of cams) absorbed.add(c);
      commonCause.push({ agent, cameras: [...cams].sort() });
    }
  }

  const push = (alert) => {
    if (cooldownKeys.has(alert.routine)) {
      suppressedCooldown += 1;
      return;
    }
    alerts.push(alert);
  };

  for (const cc of commonCause) {
    push({
      routine: `blame:common-cause:${cc.agent}`,
      blame: 'transport',
      owner: BLAME_OWNER.transport,
      severity: 'critical',
      scope: 'agent',
      cameras: cc.cameras.length,
      reason: `${cc.cameras.length} câmeras mudas sob o mesmo agente — caminho compartilhado suspeito`,
    });
  }

  // --- Passo 2: agregação por classe de culpa (escopo frota).
  const byBlame = new Map();
  for (const r of actionable) {
    if (!byBlame.has(r.blame)) {
      byBlame.set(r.blame, { rows: 0, cameras: new Set(), functions: new Set() });
    }
    const g = byBlame.get(r.blame);
    g.rows += 1;
    if (r.camera_id) g.cameras.add(r.camera_id);
    g.functions.add(r.function_name);
  }

  for (const [blame, g] of [...byBlame.entries()].sort()) {
    const fleetOnly = FLEET_ONLY_BLAMES.has(blame);
    const widespread = g.cameras.size >= T.widespreadCameras;
    if (!fleetOnly && !widespread) continue; // tratado por câmera no passo 3
    if (g.rows < T.minRows) {
      suppressedSample += 1;
      continue;
    }
    // `unknown` nunca é crítico: é pedido de triagem, não despacho.
    const severity =
      blame === 'unknown' ? 'warning' : g.rows >= T.criticalRows || widespread ? 'critical' : 'warning';
    push({
      routine: `blame:${blame}`,
      blame,
      owner: BLAME_OWNER[blame],
      severity,
      scope: 'fleet',
      cameras: g.cameras.size,
      reason: `${g.rows} falhas atribuídas a ${blame} em ${g.cameras.size} câmera(s)`,
    });
  }

  // --- Passo 3: alertas localizados (device/config) por câmera.
  const byCamera = new Map();
  for (const r of actionable) {
    if (FLEET_ONLY_BLAMES.has(r.blame)) continue;
    if (!r.camera_id || absorbed.has(r.camera_id)) continue;
    const g = byBlame.get(r.blame);
    if (g && g.cameras.size >= T.widespreadCameras) continue; // já virou alerta de frota
    const key = `${r.blame}|${r.camera_id}`;
    byCamera.set(key, (byCamera.get(key) ?? 0) + 1);
  }
  for (const [key, count] of [...byCamera.entries()].sort()) {
    const [blame, camera] = key.split('|');
    if (count < THRESHOLDS.minRows) {
      suppressedSample += 1;
      continue;
    }
    push({
      routine: `blame:${blame}:${camera}`,
      blame,
      owner: BLAME_OWNER[blame],
      severity: count >= THRESHOLDS.criticalRows ? 'critical' : 'warning',
      scope: 'camera',
      cameras: 1,
      reason: `${count} falhas atribuídas a ${blame} na mesma câmera`,
    });
  }

  // --- Passo 4: teto de rajada. Prioriza crítico e trunca com aviso explícito.
  alerts.sort((a, b) =>
    a.severity === b.severity ? a.routine.localeCompare(b.routine) : a.severity === 'critical' ? -1 : 1,
  );
  const truncated = Math.max(0, alerts.length - THRESHOLDS.maxAlertsPerRun);
  const emitted = alerts.slice(0, THRESHOLDS.maxAlertsPerRun);

  return {
    emitted,
    truncated,
    suppressed: { cooldown: suppressedCooldown, sample: suppressedSample, silent: suppressedSilent },
  };
}

// ---------------------------------------------------------------------------
// Simulação
// ---------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const BLAMES = ['device', 'transport', 'config', 'caller', 'cloud', 'unknown'];
  const failures = [];
  const fail = (scenario, msg) => failures.push(`${scenario}: ${msg}`);

  let seed = 147147;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  let scenarios = 0;
  const checkInvariants = (name, rows, out) => {
    scenarios += 1;
    const { emitted } = out;
    // I1 — `caller` jamais alerta.
    if (emitted.some((a) => a.blame === 'caller')) fail(name, 'I1: culpa `caller` gerou alerta');
    // I2 — chave de rotina única por execução.
    const keys = new Set(emitted.map((a) => a.routine));
    if (keys.size !== emitted.length) fail(name, 'I2: chave de rotina duplicada na mesma execução');
    // I3 — câmera absorvida por causa comum não recebe alerta individual.
    const ccAgents = emitted.filter((a) => a.routine.startsWith('blame:common-cause:'));
    if (ccAgents.length > 0) {
      const camAlerts = emitted.filter((a) => a.scope === 'camera' && a.blame === 'device');
      const agentCams = new Set(
        rows.filter((r) => r.blame === 'device' && r.relay_agent_id).map((r) => r.camera_id),
      );
      for (const a of camAlerts) {
        const cam = a.routine.split(':')[2];
        if (agentCams.has(cam)) fail(name, 'I3: despacho duplicado com causa comum ativa');
      }
    }
    // I4 — teto de rajada respeitado.
    if (emitted.length > THRESHOLDS.maxAlertsPerRun) fail(name, 'I4: teto de alertas estourado');
    // I5 — todo alerta tem responsável acionável.
    for (const a of emitted) {
      if (!a.owner) fail(name, `I5: alerta ${a.routine} sem responsável`);
      if (!['warning', 'critical'].includes(a.severity)) fail(name, 'I5: severidade fora do vocabulário');
      if (!a.reason || a.reason.length < 8) fail(name, 'I5: alerta sem justificativa legível');
    }
    // I6 — `unknown` nunca é crítico (é triagem, não despacho).
    if (emitted.some((a) => a.blame === 'unknown' && a.severity === 'critical'))
      fail(name, 'I6: triagem virou crítico');
    // I7 — alerta de frota nunca reporta uma única câmera como se fosse a frota.
    for (const a of emitted) {
      if (a.scope === 'camera' && a.cameras !== 1) fail(name, 'I7: escopo de câmera com contagem errada');
    }
  };

  // Cenário A — vazio e ruído puro.
  checkInvariants('vazio', [], routeBlameAlerts([]));
  {
    const rows = Array.from({ length: 200 }, () => ({
      blame: 'caller',
      camera_id: `cam-${Math.floor(rnd() * 50)}`,
      relay_agent_id: 'ag-1',
      function_name: 'resolve-camera-url',
      run_from: 'cloud',
    }));
    const out = routeBlameAlerts(rows);
    checkInvariants('deploy-abortou-200x', rows, out);
    if (out.emitted.length !== 0) fail('deploy-abortou-200x', 'aborto de deploy gerou alerta');
  }

  // Cenário B — amostra pobre: uma falha isolada nunca acorda ninguém.
  for (const blame of BLAMES) {
    for (let n = 1; n <= 2; n++) {
      const rows = Array.from({ length: n }, () => ({
        blame,
        camera_id: 'cam-solo',
        relay_agent_id: 'ag-1',
        function_name: 'f',
        run_from: 'cloud',
      }));
      const out = routeBlameAlerts(rows);
      checkInvariants(`amostra-pobre-${blame}-${n}`, rows, out);
      if (out.emitted.length !== 0) fail(`amostra-pobre-${blame}-${n}`, 'amostra abaixo do mínimo alertou');
    }
  }

  // Cenário C — causa comum: N câmeras mudas sob o mesmo agente.
  for (let cams = 1; cams <= 30; cams++) {
    const rows = [];
    for (let c = 0; c < cams; c++) {
      for (let k = 0; k < 4; k++) {
        rows.push({
          blame: 'device',
          camera_id: `cam-${c}`,
          relay_agent_id: 'ag-switch',
          function_name: 'camera-port-probe',
          run_from: 'agent',
        });
      }
    }
    const out = routeBlameAlerts(rows);
    checkInvariants(`causa-comum-${cams}`, rows, out);
    const cc = out.emitted.filter((a) => a.routine.startsWith('blame:common-cause:')).length;
    if (cams >= THRESHOLDS.widespreadCameras && cc !== 1)
      fail(`causa-comum-${cams}`, 'causa comum não consolidou em alerta único');
    if (cams >= THRESHOLDS.widespreadCameras && out.emitted.some((a) => a.scope === 'camera'))
      fail(`causa-comum-${cams}`, 'causa comum não suprimiu despacho por câmera');
    if (cams >= 20 && out.emitted.length > 3)
      fail(`causa-comum-${cams}`, `enxurrada: ${out.emitted.length} alertas para uma falha só`);
  }

  // Cenário D — tempestade de retentativa numa única câmera.
  for (const rowsCount of [3, 9, 10, 50, 500]) {
    const rows = Array.from({ length: rowsCount }, () => ({
      blame: 'config',
      camera_id: 'cam-x',
      relay_agent_id: null,
      function_name: 'resolve-camera-url',
      run_from: 'cloud',
    }));
    const out = routeBlameAlerts(rows);
    checkInvariants(`retry-storm-${rowsCount}`, rows, out);
    if (out.emitted.length !== 1) fail(`retry-storm-${rowsCount}`, 'tempestade não colapsou em 1 alerta');
    const sev = out.emitted[0].severity;
    if (rowsCount >= THRESHOLDS.criticalRows && sev !== 'critical')
      fail(`retry-storm-${rowsCount}`, 'volume alto não escalou severidade');
  }

  // Cenário E — cooldown.
  {
    const rows = Array.from({ length: 20 }, () => ({
      blame: 'config',
      camera_id: 'cam-x',
      relay_agent_id: null,
      function_name: 'f',
      run_from: 'cloud',
    }));
    const out = routeBlameAlerts(rows, new Set(['blame:config:cam-x']));
    checkInvariants('cooldown', rows, out);
    if (out.emitted.length !== 0) fail('cooldown', 'cooldown não suprimiu repetição');
    if (out.suppressed.cooldown !== 1) fail('cooldown', 'supressão não contabilizada');
  }

  // Cenário F — aleatório massivo.
  for (let i = 0; i < 400; i++) {
    const n = 1 + Math.floor(rnd() * 120);
    const rows = Array.from({ length: n }, () => ({
      blame: pick(BLAMES),
      camera_id: rnd() < 0.15 ? null : `cam-${Math.floor(rnd() * 8)}`,
      relay_agent_id: rnd() < 0.4 ? null : `ag-${Math.floor(rnd() * 3)}`,
      function_name: pick(['resolve-camera-url', 'camera-port-probe', 'onvif-autodiscover']),
      run_from: pick(['cloud', 'agent', 'relay', 'client']),
    }));
    checkInvariants(`aleatorio-${i}`, rows, routeBlameAlerts(rows));
  }

  console.log(`Onda 147 — ${scenarios} cenários simulados.`);
  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} violação(ões):`);
    for (const f of failures.slice(0, 25)) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('✅ Todas as invariantes de roteamento por responsável se mantiveram.');
}
