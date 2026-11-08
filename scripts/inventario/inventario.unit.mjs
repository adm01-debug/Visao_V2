// Testes das funcoes puras do inventario do estado real.
// Rodar: node --test scripts/inventario/inventario.unit.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  extrairInventario,
  conferirOrigem,
  montarInventario,
  rodaTodoDia,
  compararEdges,
  contarUsoNoCodigo,
  PARECE_CREDENCIAL,
  PROJETO_OFICIAL,
  tabelasDosTipos,
} from './gerar-banco.mjs';
import { semCarimbos, mudou, PADRAO } from './mudou-conteudo.mjs';
import {
  extrairChamadas,
  extrairImports,
  resolverImport,
  lerUrls,
  lerMenu,
  ARQUIVO_ROTAS,
  ARQUIVO_MENU,
} from './gerar-rotas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');

const respostaMinima = (extra = {}) => ({
  format_version: 1,
  medido_em: '2026-01-01T00:00:00Z',
  resumo: { tabelas_public: 2, ledger_versao_max: '20260101000000', ledger_registros: 10 },
  tabelas: [
    {
      nome: 'cameras',
      rls: true,
      policies: 2,
      triggers: 0,
      linhas: 5,
      bytes: 1,
      citada_no_banco: true,
    },
    {
      nome: 'alerts',
      rls: false,
      policies: 0,
      triggers: 0,
      linhas: 0,
      bytes: 1,
      citada_no_banco: false,
    },
  ],
  cron: { jobs: [], horas_paradas_7d: [], historico: { mais_de_7_dias: 0 } },
  storage: { buckets: [] },
  ...extra,
});

test('extrairInventario aceita objeto direto, envelope rows e envelope do MCP', () => {
  const alvo = respostaMinima();
  assert.equal(extrairInventario(alvo).tabelas.length, 2);
  assert.equal(extrairInventario({ rows: [{ inventario: alvo }] }).format_version, 1);
  assert.equal(
    extrairInventario({ result: { content: [{ type: 'text', text: JSON.stringify(alvo) }] } })
      .medido_em,
    '2026-01-01T00:00:00Z'
  );
  assert.equal(extrairInventario(JSON.stringify(alvo)).resumo.tabelas_public, 2);
});

test('extrairInventario recusa entrada sem as chaves do banco.sql atual', () => {
  const { storage, ...semStorage } = respostaMinima();
  assert.throws(() => extrairInventario(semStorage), /entrada sem as chaves: storage/);
  assert.throws(
    () => extrairInventario({ ...respostaMinima(), format_version: 9 }),
    /format_version 9/
  );
  assert.throws(() => extrairInventario({ ...respostaMinima(), tabelas: [] }), /sem tabelas/);
});

test('conferirOrigem recusa resposta de outro banco e ledger atrasado', () => {
  const dado = respostaMinima();
  const tipos = ['cameras', 'alerts'];
  assert.deepEqual(conferirOrigem(dado, tipos), {
    tabelas_em_comum_com_os_tipos: 2,
    tabelas_nos_tipos: 2,
  });
  assert.throws(
    () => conferirOrigem(dado, [...tipos, 'a', 'b', 'c', 'd']),
    new RegExp(PROJETO_OFICIAL)
  );
  const versoes = Array.from({ length: 30 }, (_, i) => String(20260101000000 + i));
  assert.throws(() => conferirOrigem(dado, tipos, versoes), new RegExp(PROJETO_OFICIAL));
  const emDia = {
    ...dado,
    resumo: { ...dado.resumo, ledger_versao_max: versoes.at(-1), ledger_registros: 30 },
  };
  assert.equal(conferirOrigem(emDia, tipos, versoes).migrations_no_repo, 30);
});

test('montarInventario aponta RLS, cron e bucket publico', () => {
  const dado = respostaMinima({
    cron: {
      jobs: [
        { nome: 'ok', agenda: '*/5 * * * *', ativo: true, execucoes_24h: 10, taxa_falha_7d_pct: 0 },
        {
          nome: 'ruim',
          agenda: '*/5 * * * *',
          ativo: true,
          execucoes_24h: 10,
          taxa_falha_7d_pct: 40,
        },
        { nome: 'mudo', agenda: '0 3 * * *', ativo: true, execucoes_24h: 0, taxa_falha_7d_pct: 0 },
        {
          nome: 'desligado',
          agenda: '0 3 * * *',
          ativo: false,
          execucoes_24h: 0,
          taxa_falha_7d_pct: 99,
        },
      ],
      horas_paradas_7d: [],
      historico: { mais_de_7_dias: 0 },
    },
    storage: {
      buckets: [
        { nome: 'publico', publico: true, policies: 1 },
        { nome: 'fechado', publico: false, policies: 0 },
      ],
    },
  });
  const inv = montarInventario(dado, {
    cameras: { src: 3, edges: 0 },
    alerts: { src: 0, edges: 0 },
  });
  const tipos = Object.fromEntries(inv.alertas.map((a) => [a.tipo, a.detalhe]));
  assert.deepEqual(tipos.tabela_sem_rls, ['alerts']);
  assert.deepEqual(tipos.cron_falhando, ['ruim (40% em 7d)']);
  assert.deepEqual(tipos.cron_sem_execucao, ['mudo']);
  assert.deepEqual(tipos.bucket_publico, ['publico']);
  assert.deepEqual(tipos.bucket_sem_policy, ['fechado']);
  // alerts: 0 linhas, nao citada no banco e sem .from() no codigo => orfa
  assert.deepEqual(inv.tabelas_orfas.lista, ['alerts']);
});

test('rodaTodoDia so aceita agenda que cobre todos os dias', () => {
  for (const a of ['*/5 * * * *', '0 3 * * *', '30 seconds', '0 0 1-31 1-12 0-6'])
    assert.equal(rodaTodoDia(a), true, a);
  for (const a of ['0 3 * * 1', '0 0 1 * *', '', null])
    assert.equal(rodaTodoDia(a), false, String(a));
});

test('compararEdges separa publicada sem codigo e codigo sem deploy', () => {
  const r = compararEdges(
    [
      {
        slug: 'a',
        version: 1,
        status: 'ACTIVE',
        verify_jwt: true,
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
    ['b']
  );
  assert.deepEqual(r.publicadas_sem_codigo_no_repo, ['a']);
  assert.deepEqual(r.no_repo_sem_deploy, ['b']);
  assert.equal(compararEdges(null, ['b']).publicadas, null);
});

test('PARECE_CREDENCIAL pega token e ignora texto comum', () => {
  assert.ok(PARECE_CREDENCIAL.test('Authorization: Bearer abcdefghijklmnopqrstuvwx'));
  assert.ok(PARECE_CREDENCIAL.test('sb_secret_abc'));
  assert.ok(!PARECE_CREDENCIAL.test('tabela cameras com 5 linhas'));
});

test('tabelasDosTipos le as tabelas dos tipos gerados deste repo', () => {
  const tabelas = tabelasDosTipos(RAIZ);
  assert.ok(tabelas.length > 50, `poucas tabelas: ${tabelas.length}`);
  assert.ok(tabelas.includes('cameras'));
  assert.deepEqual(tabelas, [...tabelas].sort());
});

test('contarUsoNoCodigo conta .from() de src e das edges', () => {
  const uso = contarUsoNoCodigo(RAIZ, ['cameras', 'tabela_que_nao_existe_xyz']);
  assert.ok(uso.cameras.src > 0, 'cameras deveria ter .from() em src/');
  assert.deepEqual(uso.tabela_que_nao_existe_xyz, { src: 0, edges: 0 });
});

test('semCarimbos ignora data e telemetria viva, mas nao mudanca estrutural', () => {
  const a = JSON.stringify({
    medido_em: 'x',
    cron: { jobs: [{ nome: 'j', taxa_falha_7d_pct: 9 }] },
  });
  const b = JSON.stringify({
    medido_em: 'y',
    cron: { jobs: [{ nome: 'j', taxa_falha_7d_pct: 40 }] },
  });
  const c = JSON.stringify({
    medido_em: 'y',
    cron: { jobs: [{ nome: 'outro', taxa_falha_7d_pct: 9 }] },
  });
  assert.equal(semCarimbos(a), semCarimbos(b));
  assert.notEqual(semCarimbos(a), semCarimbos(c));
  assert.equal(semCarimbos('nao e json'), 'nao e json');
  assert.equal(semCarimbos(null), null);
});

test('mudou vê arquivo novo, apagado e mudanca de conteudo', () => {
  const antes = { 'a.json': '{"x":1,"gerado_em":"1"}' };
  const depois = { 'a.json': '{"x":1,"gerado_em":"2"}' };
  const ler = (m) => (f) => (f in m ? m[f] : null);
  assert.equal(mudou(['a.json'], ler(antes), ler(depois)), false);
  assert.equal(mudou(['a.json'], ler(antes), ler({ 'a.json': '{"x":2}' })), true);
  assert.equal(mudou(['a.json'], ler({}), ler(depois)), true);
  assert.equal(mudou(['a.json'], ler(antes), ler({})), true);
  assert.deepEqual(PADRAO, [
    'inventario/estado/banco.json',
    'inventario/estado/rotas.json',
    'inventario/estado/edges.json',
  ]);
});

test('extrairChamadas acha tabela, bucket, rpc e edge (inclusive por constante)', () => {
  // `const` de nivel de modulo (coluna zero): e o unico caso que constantesDeString resolve.
  const texto = `
const BUCKET = 'camera-snapshots';
const TABELA = 'cameras';
    await supabase.from('alerts').select('*');
    await supabase.from(TABELA).select('id');
    await supabase.storage.from(BUCKET).upload(p, f);
    await supabase.rpc('create_nvr_with_channels');
    await supabase.functions.invoke('camera-ptz-control/move');
    await fetch(\`\${url}/functions/v1/rtsp-preview\`);
    await fetch(\`\${url}/rest/v1/nvrs\`);
  `;
  const c = extrairChamadas(texto);
  assert.deepEqual([...new Set(c.tabelas)].sort(), ['alerts', 'cameras', 'nvrs']);
  assert.deepEqual([...new Set(c.buckets)], ['camera-snapshots']);
  assert.deepEqual([...new Set(c.rpcs)], ['create_nvr_with_channels']);
  assert.deepEqual([...new Set(c.edges)].sort(), ['camera-ptz-control', 'rtsp-preview']);
});

test('extrairImports e resolverImport seguem alias @/ e ignoram pacote externo', () => {
  const imports = extrairImports(
    "import { useCameras } from '@/hooks/useCameras';\nimport React from 'react';"
  );
  assert.deepEqual(
    imports.map((i) => i.especificador),
    ['@/hooks/useCameras', 'react']
  );
  assert.ok(imports[0].nomes.includes('useCameras'));
  const de = path.join(RAIZ, ARQUIVO_ROTAS);
  assert.equal(resolverImport(RAIZ, de, 'react'), null);
  assert.ok(
    String(resolverImport(RAIZ, de, '@/hooks/useCameras')).endsWith('src/hooks/useCameras.ts')
  );
  assert.equal(resolverImport(RAIZ, de, '@/nao/existe/mesmo'), undefined);
});

test('lerUrls e lerMenu leem o App.tsx e o bottomNavData deste repo', () => {
  const urls = lerUrls(RAIZ);
  assert.ok(urls.length > 50, `poucas rotas: ${urls.length}`);
  const cameras = urls.find((u) => u.caminho === '/cameras');
  assert.equal(cameras.arquivo, 'src/pages/CamerasPage.tsx');
  assert.equal(cameras.protegida, true);
  assert.ok(urls.some((u) => u.redireciona === '/auth'));
  assert.equal(
    urls.filter((u) => u.componente && !u.arquivo && !u.redireciona).length,
    0,
    'toda rota com componente resolve o arquivo'
  );
  const menu = lerMenu(RAIZ);
  assert.equal(menu.cameras.caminho, '/cameras');
  assert.equal(menu.cameras.grupo, 'Monitor');
  assert.ok(Object.keys(menu).length > 10);
  assert.ok(fs.existsSync(path.join(RAIZ, ARQUIVO_MENU)));
});

test('lerUrls resolve lazy condicional em fixture isolada', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-rotas-'));
  fs.mkdirSync(path.join(raiz, 'src/pages/dev'), { recursive: true });
  fs.mkdirSync(path.join(raiz, 'src/components/navigation'), { recursive: true });
  fs.writeFileSync(
    path.join(raiz, 'src/pages/dev/Harness.tsx'),
    'export default function H() { return null; }\n'
  );
  fs.writeFileSync(
    path.join(raiz, ARQUIVO_ROTAS),
    `
const Harness = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/Harness'))
  : null;
export default function App() {
  return (
    <Routes>
      <Route path="/__test/harness" element={<Harness />} />
    </Routes>
  );
}
`
  );
  const urls = lerUrls(raiz);
  assert.deepEqual(
    urls.map((u) => [u.caminho, u.arquivo]),
    [['/__test/harness', 'src/pages/dev/Harness.tsx']]
  );
  fs.rmSync(raiz, { recursive: true, force: true });
});
