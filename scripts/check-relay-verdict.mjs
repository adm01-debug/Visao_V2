#!/usr/bin/env node
/**
 * Gate de CI — Onda 120: justiça do veredito de surdez.
 *
 * A Onda 115 reinicia agentes locais. A Onda 119 esticou janelas curtas para
 * 60s. A combinação criou um falso positivo: tarefas que o BACKEND abandonou
 * aos 25s passavam a ter janela "justa" e acusavam o agente. Somava-se a isso
 * um erro mais antigo — `failed` (o agente respondeu com o erro do alvo)
 * contava como surdez, transformando uma câmera com senha errada em reinício
 * de agente saudável.
 *
 * Este gate trava as três regras no banco real e a conformidade dos produtores:
 *  1. `heal_local_agents` trata `failed` como prova de vida.
 *  2. `heal_local_agents` exclui abandono do backend do numerador.
 *  3. As salvaguardas da Onda 118 continuam vivas na função.
 *  4. Nenhum produtor Deno grava TTL abaixo da janela justa nem o motivo
 *     genérico `backend_timeout`.
 *  5. Paridade do motivo canônico entre TypeScript, Deno e SQL.
 *  6. Nenhum dado histórico contradiz a política em vigor.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];
const notes = [];

function query(sql) {
  return execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
}
function check(label, condition, detail) {
  if (!condition) failures.push(`${label}: ${detail}`);
}

// --- Fonte única de verdade (TypeScript) ------------------------------------
const verdictSrc = readFileSync(new URL('../src/lib/relayVerdict.ts', import.meta.url), 'utf8');
const windowSrc = readFileSync(
  new URL('../supabase/functions/_shared/relayWindow.ts', import.meta.url), 'utf8');

const ABANDONED = 'relay_backend_abandoned';
check('PARIDADE', verdictSrc.includes(ABANDONED),
  `src/lib/relayVerdict.ts não declara o motivo canônico "${ABANDONED}"`);
check('PARIDADE', windowSrc.includes(`RELAY_BACKEND_ABANDONED = "${ABANDONED}"`),
  `_shared/relayWindow.ts não declara o motivo canônico "${ABANDONED}"`);

const fairDeno = Number((windowSrc.match(/RELAY_FAIR_WINDOW_SEC\s*=\s*(\d+)/) || [])[1]);
check('PARIDADE', fairDeno === 60,
  `janela justa no Deno é ${fairDeno}s, o SQL exige 60s`);

// --- Corpo da função de cura -------------------------------------------------
const heal = query(`
  SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'heal_local_agents'`);
check('CURA', heal.length > 0, 'heal_local_agents não existe');

if (heal) {
  // 1) `failed` é prova de vida — precisa estar no mesmo FILTER de `done`.
  check('CURA', /status IN \('done',\s*'failed'\)/.test(heal),
    '`failed` não é contado como prova de vida — agente saudável com câmera '
    + 'quebrada ainda pode ser reiniciado');

  // 2) O abandono do backend não pode alimentar o numerador de surdez.
  // A string "AS expired" aparece duas vezes (agregado externo e subquery de
  // contagem). O numerador real é o último — usar indexOf pegaria o alias de
  // fora e o gate passaria sem olhar a regra que importa.
  const fimNumerador = heal.lastIndexOf('AS expired');
  const numerador = heal.slice(Math.max(0, fimNumerador - 1200), fimNumerador);
  check('CURA', numerador.includes(ABANDONED),
    `numerador de surdez não exclui "${ABANDONED}" — a desistência do backend `
    + 'continua sendo cobrada do agente');
  check('CURA', numerador.includes('backend_timeout'),
    'numerador de surdez não exclui o motivo legado "backend_timeout" — linhas '
    + 'antigas ainda acusam o agente');
  check('CURA', numerador.includes("interval '60 seconds'"),
    'numerador perdeu o corte de janela justa da Onda 119');

  // 3) Salvaguardas da Onda 118 preservadas pela reescrita cirúrgica.
  for (const marca of ['stable_hash32', 'scheduled_at', 'SECURITY DEFINER']) {
    check('REGRESSÃO', heal.includes(marca),
      `a reescrita da Onda 120 perdeu "${marca}" da Onda 118`);
  }

  // A mensagem antiga culpava o agente por falhas do alvo; não pode voltar.
  check('CURA', !heal.includes('expiraram/falharam'),
    'mensagem de diagnóstico antiga ainda culpa o agente por falhas do alvo');
}

// --- 4) Conformidade dos produtores Deno -------------------------------------
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const fnDir = new URL('../supabase/functions', import.meta.url).pathname;
for (const file of walk(fnDir)) {
  if (file.endsWith('relayWindow.ts')) continue;
  const src = readFileSync(file, 'utf8');
  const rel = file.slice(fnDir.length + 1);

  // Produtor = quem insere na fila de relay.
  const ehProdutor = src.includes('agent_relay_tasks');
  if (!ehProdutor) continue;

  // TTL literal abaixo da janela justa cria linha não diagnosticável.
  const ttl = src.match(/RELAY_TASK_TTL_SEC\s*=\s*(\d+)/);
  check('PRODUTOR', !ttl || Number(ttl[1]) >= 60,
    `${rel} grava TTL literal de ${ttl && ttl[1]}s — abaixo da janela justa de 60s, `
    + 'a tarefa vira ruído para o diagnóstico de surdez');

  // Motivo genérico de expiração é indistinguível de silêncio do agente.
  check('PRODUTOR', !/error:\s*["']backend_timeout["']/.test(src),
    `${rel} ainda grava o motivo genérico "backend_timeout" — use `
    + 'RELAY_BACKEND_ABANDONED de _shared/relayWindow.ts');

  if (/status:\s*["']expired["']/.test(src)) {
    check('PRODUTOR', src.includes('RELAY_BACKEND_ABANDONED'),
      `${rel} expira tarefas sem importar o motivo canônico de abandono`);
  }
}

// --- 5) Coerência dos dados históricos ---------------------------------------
const contradicoes = query(`
  SELECT count(*) FROM public.agent_relay_tasks
   WHERE status = 'failed' AND completed_at IS NULL`);
check('DADOS', Number(contradicoes) === 0,
  `${contradicoes} tarefa(s) marcadas como 'failed' sem completed_at — resposta `
  + 'do agente sem carimbo torna a prova de vida indatável');

const janelaCurta = query(`
  SELECT count(*) FROM public.agent_relay_tasks
   WHERE created_at > now() - interval '1 day'
     AND (expires_at - scheduled_at) < interval '60 seconds'`);
if (Number(janelaCurta) > 0) {
  notes.push(`${janelaCurta} tarefa(s) das últimas 24h com janela < 60s (produtor antigo antes do deploy).`);
}

const abandono = query(`
  SELECT count(*) FROM public.agent_relay_tasks
   WHERE error IN ('backend_timeout', '${ABANDONED}')`);
notes.push(`${abandono} tarefa(s) historicamente abandonadas pelo backend, agora neutras no veredito.`);

// --- Resultado ---------------------------------------------------------------
for (const n of notes) console.log(`ℹ️  ${n}`);
if (failures.length) {
  console.error('\n❌ Veredito de surdez injusto — reinícios indevidos possíveis:\n');
  for (const f of failures) console.error(`   • ${f}`);
  process.exit(1);
}
console.log('✅ Veredito justo: agente só é acusado por silêncio próprio com janela justa.');
