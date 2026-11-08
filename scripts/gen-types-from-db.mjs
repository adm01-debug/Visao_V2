#!/usr/bin/env node
/**
 * gen-types-from-db.mjs — sincroniza src/integrations/supabase/types.ts com o
 * banco de PRODUÇÃO via gateway MCP do Supabase (JSON-RPC over HTTP).
 * Merge-patch: preserva blocos existentes (Relationships incluídos),
 * injeta colunas novas, gera blocos para tabelas novas.
 * Uso: VISAO_MCP_URL=<url> node scripts/gen-types-from-db.mjs [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPES = join(HERE, '..', 'src', 'integrations', 'supabase', 'types.ts');
const MCP = process.env.VISAO_MCP_URL;
const WRITE = process.argv.includes('--write');
if (!MCP) { console.error('ERRO: defina VISAO_MCP_URL.'); process.exit(1); }

const COLS = (rel) => `(SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
  'udt', t.typname, 'nsp', tn.nspname, 'nullable', NOT a.attnotnull,
  'default', COALESCE(pg_get_expr(ad.adbin, ad.adrelid), ''),
  'identity', a.attidentity <> '', 'generated', a.attgenerated <> ''
) ORDER BY a.attnum), '[]'::jsonb)
FROM pg_attribute a
LEFT JOIN pg_attrdef ad ON ad.adrelid = ${rel}.oid AND ad.adnum = a.attnum
LEFT JOIN pg_type t ON t.oid = a.atttypid
LEFT JOIN pg_namespace tn ON tn.oid = t.typnamespace
WHERE a.attrelid = ${rel}.oid AND a.attnum > 0 AND NOT a.attisdropped)`;

const SQL = `SELECT jsonb_build_object(
 'tables', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.relname, 'cols', ${COLS('c')}) ORDER BY c.relname), '[]'::jsonb)
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'),
 'views', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.relname, 'cols', ${COLS('c')}) ORDER BY c.relname), '[]'::jsonb)
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'v'),
 'enums', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.typname, 'values', (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder))) ORDER BY t.typname), '[]'::jsonb)
   FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' GROUP BY t.typname),
 'fks', (SELECT COALESCE(jsonb_agg(jsonb_build_object('table', conrelid::regclass::text, 'name', conname, 'ref', confrelid::regclass::text,
   'cols', (SELECT jsonb_agg(a.attname ORDER BY x.ord) FROM unnest(conkey) WITH ORDINALITY x(attnum, ord) JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = x.attnum),
   'refcols', (SELECT jsonb_agg(a.attname ORDER BY x.ord) FROM unnest(confkey) WITH ORDINALITY x(attnum, ord) JOIN pg_attribute a ON a.attrelid = confrelid AND a.attnum = x.attnum),
   'one2one', array_length(conkey, 1) = 1)) ORDER BY conrelid::regclass::text, conname), '[]'::jsonb)
   FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace)
) AS catalog`;
if (process.argv.includes('--dump-sql')) { console.log(SQL); process.exit(0); }

async function fetchCatalog() {
  const res = await fetch(MCP, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'supabase_db_query', arguments: { query: SQL } } }),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  const outer = await res.json();
  if (outer.error) throw new Error(`MCP error: ${JSON.stringify(outer.error).slice(0, 300)}`);
  let inner;
  try {
    inner = JSON.parse(outer.result.content[0].text);
  } catch {
    throw new Error('MCP tool error: ' + outer.result.content[0].text.slice(0, 300));
  }
  if (!inner.results?.[0]) throw new Error('query falhou: ' + JSON.stringify(inner).slice(0, 300));
  return inner.results[0].rows[0].catalog;
}

const PG_MAP = {
  uuid: 'string', text: 'string', varchar: 'string', bpchar: 'string', char: 'string', name: 'string', citext: 'string',
  bool: 'boolean', boolean: 'boolean', int2: 'number', int4: 'number', int8: 'number', smallint: 'number', integer: 'number', bigint: 'number',
  numeric: 'string', decimal: 'string', money: 'string', float4: 'number', float8: 'number', real: 'number', 'double precision': 'number',
  json: 'Json', jsonb: 'Json', bytea: 'string', date: 'string', timestamp: 'string', timestamptz: 'string', time: 'string', timetz: 'string',
  interval: 'string', inet: 'string', cidr: 'string', macaddr: 'string', tsvector: 'string', tsquery: 'string', bit: 'string', varbit: 'string',
};

function tsType(col, enumByUdt) {
  let t = col.type.replace(/\(\d+(,\d+)?\)/, '').replace(' with time zone', 'tz').replace(' without time zone', '');
  const arr = t.endsWith('[]');
  if (arr) t = t.slice(0, -2);
  const e = col.nsp === 'public' ? enumByUdt.get(col.udt) : undefined;
  let base = e ? e.map((v) => `'${v}'`).join(' | ') : (PG_MAP[t] ?? 'string');
  return arr ? `(${base})[]` : base;
}

const colRow = (c, em) => `          ${c.name}: ${tsType(c, em)}${c.nullable ? ' | null' : ''}`;
const colIns = (c, em) => {
  const T = tsType(c, em);
  if (c.generated) return `          ${c.name}?: never`;
  if (c.identity) return `          ${c.name}?: never`;
  if (c.nullable) return `          ${c.name}?: ${T} | null`;
  if (c.default) return `          ${c.name}?: ${T}`;
  return `          ${c.name}: ${T}`;
};
const colUpd = (c, em) => `          ${c.name}?: ${tsType(c, em)}${c.nullable ? ' | null' : ''}`;

function renderTable(t, fks, em) {
  const rel = fks.filter((f) => f.table === t.name && !f.ref.startsWith('auth.'))
    .map((f) => `          {
            foreignKeyName: "${f.name}"
            columns: [${f.cols.map((c) => `"${c}"`).join(', ')}]
            isOneToOne: ${f.one2one}
            referencedRelation: "${f.ref}"
            referencedColumns: [${f.refcols.map((c) => `"${c}"`).join(', ')}]
          },`)
    .join('\n');
  return `      ${t.name}: {
        Row: {
${t.cols.map((c) => colRow(c, em)).join('\n')}
        }
        Insert: {
${t.cols.map((c) => colIns(c, em)).join('\n')}
        }
        Update: {
${t.cols.map((c) => colUpd(c, em)).join('\n')}
        }
        Relationships: [
${rel || ''}
        ]
      }`;
}

const renderView = (v, em) => `      ${v.name}: {
        Row: {
${v.cols.map((c) => colRow(c, em)).join('\n')}
        }
      }`;

// ---------- parser do types.ts atual ----------
const findLine = (lines, exact) => lines.findIndex((l) => l === exact);

function parseBlocks(bodyLines) {
  const blocks = new Map();
  let cur = null;
  for (const l of bodyLines) {
    const m = /^      ([A-Za-z0-9_]+): \{$/.exec(l);
    if (m && !cur) { cur = { name: m[1], lines: [l] }; continue; }
    if (cur) {
      cur.lines.push(l);
      if (l === '      }') { blocks.set(cur.name, cur); cur = null; }
    }
  }
  return blocks;
}

function sectionCols(block) {
  const cols = new Set();
  let inRow = false;
  for (const l of block.lines) {
    if (/^        Row: \{$/.test(l)) { inRow = true; continue; }
    if (inRow && l === '        }') break;
    if (inRow) { const m = /^          ([A-Za-z0-9_]+)\??: /.exec(l); if (m) cols.add(m[1]); }
  }
  return cols;
}

function injectCols(block, table, plan, em) {
  const have = sectionCols(block);
  const missing = table.cols.filter((c) => !have.has(c.name));
  if (!missing.length) return block.lines;
  plan.addedCols[table.name] = missing.map((c) => `${c.name}(${c.type}${c.nullable ? '?' : ''})`);
  const out = [...block.lines];
  for (const sec of ['Row', 'Insert', 'Update']) {
    const gen = { Row: colRow, Insert: colIns, Update: colUpd }[sec];
    const start = out.findIndex((l) => l === `        ${sec}: {`);
    if (start < 0) continue;
    let end = start + 1;
    while (out[end] !== '        }') end++;
    const add = missing.map((c) => gen(c, em));
    out.splice(end, 0, ...add);
  }
  return out;
}

// ---------- main ----------
const src = readFileSync(TYPES, 'utf8');
const lines = src.split('\n');
const iTables = findLine(lines, '    Tables: {');
const iViews = findLine(lines, '    Views: {');
const iFuncs = findLine(lines, '    Functions: {');
const iEnums = findLine(lines, '    Enums: {');
const iComp = findLine(lines, '    CompositeTypes: {');
if ([iTables, iViews, iFuncs, iEnums, iComp].some((i) => i < 0)) {
  console.error('ERRO: âncoras do formato supabase gen types não encontradas.'); process.exit(1);
}

const tablesBody = lines.slice(iTables + 1, iViews - 1); // exclui '    }' de fechamento
const viewsBody = lines.slice(iViews + 1, iFuncs - 1);
const funcsBlock = lines.slice(iFuncs - 1 >= 0 ? iFuncs : 0, iEnums - 1); // '    Functions: {' até antes do '    }' + iEnums
const enumsBody = lines.slice(iEnums + 1, iComp - 1);
const compBlock = lines.slice(iComp, lines.indexOf('    }', iComp) + 1);

const curTables = parseBlocks(tablesBody);
const curViews = parseBlocks(viewsBody);

console.log('Catálogo do banco...');
const cat = await fetchCatalog();
const enumByUdt = new Map(cat.enums.map((e) => [e.name, e.values]));
const catTableNames = new Set(cat.tables.map((t) => t.name));
const plan = { newTables: [], addedCols: {}, newViews: [], newEnums: [] };

const mergedTables = cat.tables.map((t) => {
  const cur = curTables.get(t.name);
  if (!cur) { plan.newTables.push(t.name); return renderTable(t, cat.fks, enumByUdt); }
  return injectCols(cur, t, plan, enumByUdt).join('\n');
});
const extraTables = [...curTables.keys()].filter((n) => !catTableNames.has(n));
const extraBlocks = extraTables.map((n) => curTables.get(n).lines.join('\n'));

const catViewNames = new Set(cat.views.map((v) => v.name));
const mergedViews = cat.views.map((v) => {
  const cur = curViews.get(v.name);
  if (!cur) { plan.newViews.push(v.name); return renderView(v, enumByUdt); }
  return cur.lines.join('\n');
});
const extraViews = [...curViews.keys()].filter((n) => !catViewNames.has(n)).map((n) => curViews.get(n).lines.join('\n'));

const curEnumNames = new Set([...enumsBody.map((l) => /^      ([A-Za-z0-9_]+): /.exec(l)?.[1]).filter(Boolean)]);
const newEnumLines = cat.enums.filter((e) => !curEnumNames.has(e.name)).map((e) => {
  plan.newEnums.push(e.name);
  return `      ${e.name}: ${e.values.map((v) => `"${v}"`).join(' | ')}`;
});

console.log('=== PLANO (dry-run) ===');
console.log(`Tabelas NOVAS (+${plan.newTables.length}):`, plan.newTables.join(', ') || '—');
console.log(`Colunas NOVAS em tabelas existentes: ${Object.keys(plan.addedCols).length} tabelas`);
for (const [t, cs] of Object.entries(plan.addedCols)) console.log(`  ${t}: ${cs.join(', ')}`);
console.log(`Views NOVAS (+${plan.newViews.length}):`, plan.newViews.join(', ') || '—');
console.log(`Enums NOVOS (+${plan.newEnums.length}):`, plan.newEnums.join(', ') || '—');
console.log(`Extras preservados (no arquivo, fora do banco): ${extraTables.length} tabelas, ${extraViews.length} views`);

if (!WRITE) { console.log('\n(dry-run — use --write para aplicar)'); process.exit(0); }

const out = [
  ...lines.slice(0, iTables + 1),
  ...mergedTables,
  ...extraBlocks,
  '    }',
  '    Views: {',
  ...mergedViews,
  ...extraViews,
  '    }',
  ...funcsBlock,
  '    Enums: {',
  ...enumsBody.filter((l) => l.trim()),
  ...(newEnumLines.length ? [','] : []),
  ...newEnumLines,
  '    }',
  ...compBlock,
  ...lines.slice(lines.indexOf('    }', iComp) + 1),
].join('\n');
writeFileSync(TYPES, out);
console.log(`\n✅ types.ts atualizado (${out.split('\n').length} linhas).`);
