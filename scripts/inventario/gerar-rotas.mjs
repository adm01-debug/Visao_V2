#!/usr/bin/env node
/**
 * Inventario das rotas do front -> inventario/estado/rotas.json (fonte de consulta dos agentes).
 *
 * Le o codigo, nao documentacao:
 *  - URLs:  src/App.tsx (<Route path>, componente lazy, ProtectedLayoutRoute/ProtectedRoute
 *           minRole, <Navigate> e o titulo de withRouteErrorBoundary)
 *  - Menu:  src/components/navigation/bottomNavData.ts (allCategories: categoria, rotulo, path,
 *           papel minimo) -> e o que o usuario consegue abrir pela UI
 *  - Para cada pagina: segue os imports a partir do arquivo da pagina (src/hooks/, src/services/,
 *    src/lib/, src/stores/, src/contexts/, src/utils/ e os componentes da propria feature) e lista
 *    hooks, edge functions invocadas, RPCs, tabelas (.from e /rest/v1) e buckets de storage.
 *  - `problemas`: item de menu sem rota, rota protegida fora do menu, rota sem arquivo e import
 *    local que nao resolve.
 *
 * Uso:
 *   node scripts/inventario/gerar-rotas.mjs           grava inventario/estado/rotas.json
 *   node scripts/inventario/gerar-rotas.mjs --check   exit 1 se o arquivo commitado esta desatualizado
 * Saida deterministica (sem data): o mesmo codigo gera o mesmo arquivo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA_REL = 'inventario/estado/rotas.json';
const EXTENSOES = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

const ler = (raiz, rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
const rel = (raiz, abs) => path.relative(raiz, abs).split(path.sep).join('/');
const unico = (lista) => [...new Set(lista)].sort();

/** Resolve um especificador de import para um arquivo do repo (ou null se externo/inexistente). */
export function resolverImport(raiz, deArquivoAbs, especificador) {
  let base;
  if (especificador.startsWith('@/')) base = path.join(raiz, 'src', especificador.slice(2));
  else if (especificador.startsWith('.'))
    base = path.resolve(path.dirname(deArquivoAbs), especificador);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSOES) if (fs.existsSync(base + ext)) return base + ext;
  return undefined; // local, mas nao existe
}

/** Imports de um arquivo: [{ especificador, nomes[] }] (estaticos e import() dinamico). */
export function extrairImports(texto) {
  const out = [];
  for (const m of texto.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const nomes = [...m[2].matchAll(/\b([A-Za-z_$][\w$]*)\b(?!\s*as\b)/g)]
      .map((x) => x[1])
      .filter((n) => !['type', 'as', 'default'].includes(n));
    out.push({ especificador: m[3], nomes });
  }
  for (const m of texto.matchAll(/(?:import|export)\s*(?:\*\s*from\s*)?['"]([^'"]+)['"]/g))
    out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g))
    out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g))
    out.push({ especificador: m[1], nomes: [] });
  return out;
}

/**
 * Mapa nome -> valor dos `const NOME = 'literal'` (ou `export const`) de nivel de modulo no texto.
 * So resolve o caso mais comum do repo: identificador passado direto pra `.from`/`fromTable`/
 * `storage.from`/`rpc`/`invoke` que e, no mesmo arquivo, uma constante de string (ex.:
 * uma constante de string do proprio arquivo). Nao resolve parametro de funcao nem ternario.
 * Coluna zero sozinha nao basta (achado do Qodo na revisao desta correcao): um `const` dentro
 * de funcao tambem pode estar em coluna zero se o arquivo nao passou pelo Prettier (o repo nao
 * tem `prettier --check` no CI). Por isso conta profundidade de `{`/`}` linha a linha e so
 * aceita o `const` quando a profundidade, ANTES de processar a linha, e zero (nivel de modulo
 * de verdade). Contagem ingenua (nao ignora chave dentro de string/template) e de proposito:
 * na duvida, prefere nao resolver a resolver errado.
 */
function constantesDeString(texto) {
  const mapa = new Map();
  let profundidade = 0;
  for (const linha of texto.split('\n')) {
    if (profundidade === 0) {
      const m = linha.match(
        /^(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^=]+)?=\s*['"`]([A-Za-z0-9_.-]+)['"`]\s*[;,]?\s*$/
      );
      if (m) mapa.set(m[1], m[2]);
    }
    for (const ch of linha) {
      if (ch === '{') profundidade++;
      else if (ch === '}') profundidade--;
    }
  }
  return mapa;
}

/**
 * Chamadas ao Supabase num texto: tabelas (`.from` do cliente, `fromTable` e `/rest/v1/<tabela>`),
 * buckets (`storage.from`), RPCs (`.rpc`) e edges (`functions.invoke`, `invokeEdge`,
 * `/functions/v1/<edge>`).
 */
export function extrairChamadas(texto) {
  const pegar = (re) => [...texto.matchAll(re)].map((m) => m[1]);
  const consts = constantesDeString(texto);
  const tabelas = [];
  const buckets = [];
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g))
    (m[1] ? buckets : tabelas).push(m[2]);
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    if (consts.has(m[2])) (m[1] ? buckets : tabelas).push(consts.get(m[2]));
  }
  // `fromTable('x')` / `fromTable(CONST)` — atalho tipado de helper local, sempre tabela.
  for (const m of texto.matchAll(/\bfromTable\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)) tabelas.push(m[1]);
  for (const m of texto.matchAll(/\bfromTable\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    if (consts.has(m[1])) tabelas.push(consts.get(m[1]));
  }
  tabelas.push(...pegar(/\/rest\/v1\/([A-Za-z0-9_]+)/g).filter((t) => t !== 'rpc'));
  return {
    tabelas,
    buckets,
    // `.rpc('x')` e o apelido `const rpc = supabase.rpc.bind(...)` + `rpc('x')`.
    rpcs: [
      ...pegar(/(?:\.|\b)rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g),
      ...pegar(/\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/g),
    ],
    // `functions.invoke` (inclusive quebrado em linha) e o atalho `invokeEdge<T>(...)`;
    // `invoke('camera-ptz-control/move')` conta como a edge `camera-ptz-control`. A chamada direta
    // pela URL (`fetch(`${SUPABASE_URL}/functions/v1/x`)`) so conta dentro de string/template.
    edges: [
      ...pegar(
        /(?:functions\s*\.\s*invoke|\binvokeEdge)(?:<[^>()]*>)?\(\s*['"`]([A-Za-z0-9_-]+)(?:\/[^'"`]*)?['"`]/g
      ),
      ...pegar(/['"`][^'"`\n]*\/functions\/v1\/([A-Za-z0-9_-]+)/g),
    ],
  };
}

const ehTeste = (p) => /(\.test\.|\.spec\.|__tests__|\.stories\.)/.test(p);

/**
 * Fecho de imports a partir do arquivo da pagina. Segue sem limite a pasta da propria pagina,
 * src/hooks/, src/services/, src/lib/, src/stores/, src/contexts/ e src/utils/ (helpers que chamam
 * edge/RPC/tabela); componentes de OUTRA pasta em src/components/ entram ate MAX_SALTOS_FEATURE
 * saltos. Fica de fora so o kit de UI (src/components/ui/) e teste. Import local que nao resolve
 * vira problema.
 */
export const MAX_SALTOS_FEATURE = 2;
export function fechoDaPagina(raiz, arquivoPaginaAbs) {
  const pastaFeature = path.dirname(arquivoPaginaAbs);
  const dentro = (abs, rel_) => abs.startsWith(path.join(raiz, rel_) + path.sep);
  const livre = (abs) =>
    abs.startsWith(pastaFeature + path.sep) ||
    ['src/hooks', 'src/services', 'src/lib', 'src/stores', 'src/contexts', 'src/utils'].some((d) =>
      dentro(abs, d)
    );
  const outraFeature = (abs) => dentro(abs, 'src/components') && !dentro(abs, 'src/components/ui');
  const saltosVistos = new Map(); // arquivo -> menor numero de saltos com que foi visitado
  const hooks = new Map();
  const quebrados = new Set();
  const chamadas = { tabelas: [], buckets: [], rpcs: [], edges: [] };
  const fila = [[arquivoPaginaAbs, 0]];
  while (fila.length) {
    const [atual, saltos] = fila.shift();
    if (saltosVistos.has(atual) && saltosVistos.get(atual) <= saltos) continue;
    const primeiraVez = !saltosVistos.has(atual);
    saltosVistos.set(atual, saltos);
    const texto = fs.readFileSync(atual, 'utf8');
    if (primeiraVez) {
      const c = extrairChamadas(texto);
      for (const k of Object.keys(chamadas)) chamadas[k].push(...c[k]);
    }
    for (const imp of extrairImports(texto)) {
      const alvo = resolverImport(raiz, atual, imp.especificador);
      if (
        alvo === undefined &&
        !/\.(css|scss|svg|png|jpe?g|webp|gif|json)(\?.*)?$|\?/.test(imp.especificador)
      ) {
        quebrados.add(`${rel(raiz, atual)} -> ${imp.especificador}`);
      }
      if (!alvo || ehTeste(alvo)) continue;
      for (const nome of imp.nomes)
        if (/^use[A-Z]/.test(nome) && !hooks.has(nome)) hooks.set(nome, rel(raiz, alvo));
      if (livre(alvo)) fila.push([alvo, saltos]);
      else if (outraFeature(alvo) && saltos < MAX_SALTOS_FEATURE) fila.push([alvo, saltos + 1]);
    }
  }
  return {
    arquivos_lidos: saltosVistos.size,
    hooks: [...hooks.entries()]
      .map(([nome, arquivo]) => ({ nome, arquivo }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    buckets: unico(chamadas.buckets),
    edges: unico(chamadas.edges),
    rpcs: unico(chamadas.rpcs),
    tabelas: unico(chamadas.tabelas),
    imports_quebrados: [...quebrados].sort(),
  };
}

/**
 * URLs do react-router em src/App.tsx: caminho, componente, arquivo (resolvido pelo `lazy(() =>
 * import(...))` do proprio App.tsx), titulo do withRouteErrorBoundary, se exige sessao
 * (ProtectedLayoutRoute/ProtectedRoute), papel minimo (minRole) e redirecionamento (<Navigate>).
 */
export const ARQUIVO_ROTAS = 'src/App.tsx';
const IGNORAR_COMPONENTE = new Set([
  'Route',
  'Routes',
  'Navigate',
  'Suspense',
  'ProtectedRoute',
  'ProtectedLayoutRoute',
  'ErrorBoundary',
  'SectionErrorBoundary',
  'PageLoader',
  'Fragment',
]);
export function lerUrls(raiz) {
  const texto = ler(raiz, ARQUIVO_ROTAS);
  const abs = path.join(raiz, ARQUIVO_ROTAS);
  // Aceita tambem o lazy condicional (`const X = import.meta.env.DEV ? lazy(() => import('...'))`).
  const lazy = Object.fromEntries(
    [
      ...texto.matchAll(
        /const\s+(\w+)\s*=\s*(?:[\s\S]{0,60}?\?\s*)?lazy\w*\(\s*\(\)\s*=>\s*(?:[\s\S]{0,80}?)import\(\s*['"]([^'"]+)['"]\s*\)/g
      ),
    ].map((m) => [m[1], m[2]])
  );
  const corpo = texto.slice(texto.indexOf('<Routes>'), texto.lastIndexOf('</Routes>'));
  return corpo
    .split(/<Route\b/)
    .slice(1)
    .map((pedaco) => {
      const caminho = (pedaco.match(/path(?:=|:\s*)["']([^"']+)["']/) || [])[1];
      const redireciona = (pedaco.match(/<Navigate\s+to=["']([^"']+)["']/) || [])[1] ?? null;
      const componente =
        [...pedaco.matchAll(/<([A-Z]\w*)/g)]
          .map((m) => m[1])
          .find((n) => !IGNORAR_COMPONENTE.has(n)) ?? null;
      const titulo =
        (pedaco.match(/withRouteErrorBoundary\(\s*<[^>]+>\s*,\s*['"]([^'"]+)['"]/) || [])[1] ??
        (pedaco.match(/withRouteErrorBoundary\([\s\S]*?,\s*['"]([^'"]+)['"]\s*\)/) || [])[1] ??
        null;
      const papelMinimo = (pedaco.match(/minRole=["']([a-z_]+)["']/) || [])[1] ?? null;
      const alvo =
        componente && lazy[componente] ? resolverImport(raiz, abs, lazy[componente]) : null;
      return {
        caminho,
        componente,
        arquivo: alvo ? rel(raiz, alvo) : null,
        titulo,
        protegida: /<ProtectedLayoutRoute|<ProtectedRoute/.test(pedaco),
        papel_minimo: papelMinimo,
        redireciona,
      };
    })
    .filter((u) => u.caminho)
    .sort((a, b) => a.caminho.localeCompare(b.caminho));
}

/**
 * Itens de navegacao de src/components/navigation/bottomNavData.ts (allCategories):
 * id -> { rotulo, grupo, caminho, papel_minimo }. E a entrada do usuario na UI.
 */
export const ARQUIVO_MENU = 'src/components/navigation/bottomNavData.ts';
export function lerMenu(raiz) {
  const texto = ler(raiz, ARQUIVO_MENU);
  const inicio = texto.indexOf('allCategories');
  const corpo = inicio >= 0 ? texto.slice(inicio) : texto;
  // Cada categoria abre com id/label/icon/defaultPath; os items vem depois, ate a proxima categoria.
  const categorias = [
    ...corpo.matchAll(
      /\{\s*\n?\s*id:\s*'([^']+)',\s*\n?\s*label:\s*'([^']+)',\s*\n?\s*icon:\s*\w+,\s*\n?\s*defaultPath:\s*'([^']+)'/g
    ),
  ].map((m) => ({ id: m[1], label: m[2], defaultPath: m[3], pos: m.index }));
  const menu = {};
  for (const m of corpo.matchAll(
    /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*icon:\s*\w+,\s*path:\s*'([^']+)'([^}]*)\}/g
  )) {
    const categoria = categorias.filter((c) => c.pos < m.index).pop() ?? null;
    menu[m[1]] = {
      rotulo: m[2],
      caminho: m[3],
      grupo: categoria ? categoria.label : null,
      grupo_id: categoria ? categoria.id : null,
      papel_minimo: (m[4].match(/minRole:\s*'([a-z_]+)'/) || [])[1] ?? null,
    };
  }
  return menu;
}

/** Monta o inventario inteiro a partir de uma raiz de repo. */
export function gerarRotas(raiz = RAIZ_PADRAO) {
  const menu = lerMenu(raiz);
  const caminhosDeMenu = new Set(Object.values(menu).map((i) => i.caminho));
  const urlsBase = lerUrls(raiz);
  const urls = urlsBase.map((u) => {
    const noMenu = Object.entries(menu)
      .filter(([, i]) => i.caminho === u.caminho)
      .map(([id, i]) => ({ id, rotulo: i.rotulo, grupo: i.grupo, papel_minimo: i.papel_minimo }));
    return {
      ...u,
      menu: noMenu.length ? noMenu : null,
      ...(u.arquivo
        ? fechoDaPagina(raiz, path.join(raiz, u.arquivo))
        : {
            arquivos_lidos: 0,
            hooks: [],
            buckets: [],
            edges: [],
            rpcs: [],
            tabelas: [],
            imports_quebrados: [],
          }),
    };
  });

  const hooks = {};
  for (const u of urls)
    for (const h of u.hooks) {
      hooks[h.nome] ??= { arquivo: h.arquivo, rotas: [] };
      hooks[h.nome].rotas.push(u.caminho);
    }

  const caminhosDeRota = new Set(urls.map((u) => u.caminho));
  const problemas = [
    ...Object.entries(menu)
      .filter(([, i]) => !caminhosDeRota.has(i.caminho))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, i]) => ({
        tipo: 'menu_sem_rota',
        id,
        detalhe: `item "${i.rotulo}" aponta para ${i.caminho}, que nao tem <Route> em ${ARQUIVO_ROTAS}`,
      })),
    ...urls
      .filter((u) => u.protegida && !u.menu && !u.redireciona && !u.caminho.includes(':'))
      .map((u) => ({
        tipo: 'rota_sem_menu',
        id: u.caminho,
        detalhe: 'rota protegida sem item em bottomNavData: so chega quem digita a URL',
      })),
    ...urls
      .filter((u) => u.componente && !u.arquivo && !u.redireciona)
      .map((u) => ({
        tipo: 'rota_sem_arquivo',
        id: u.caminho,
        detalhe: `${u.componente} nao resolve pelo lazy() de ${ARQUIVO_ROTAS}`,
      })),
    ...urls.flatMap((u) =>
      u.imports_quebrados.map((q) => ({ tipo: 'import_quebrado', id: u.caminho, detalhe: q }))
    ),
  ];

  return {
    format_version: 1,
    fonte: `scripts/inventario/gerar-rotas.mjs (le ${ARQUIVO_ROTAS}, ${ARQUIVO_MENU} e os imports de cada pagina)`,
    resumo: {
      urls: urls.length,
      rotas_com_pagina: urls.filter((u) => u.arquivo).length,
      redirecionamentos: urls.filter((u) => u.redireciona).length,
      protegidas: urls.filter((u) => u.protegida).length,
      itens_de_menu: Object.keys(menu).length,
      caminhos_no_menu: caminhosDeMenu.size,
      hooks_distintos: Object.keys(hooks).length,
      problemas: problemas.length,
    },
    urls,
    menu: Object.fromEntries(
      Object.keys(menu)
        .sort()
        .map((k) => [k, menu[k]])
    ),
    hooks: Object.fromEntries(
      Object.keys(hooks)
        .sort()
        .map((k) => [k, { arquivo: hooks[k].arquivo, rotas: unico(hooks[k].rotas) }])
    ),
    problemas,
  };
}

export const serializar = (inv) => JSON.stringify(inv, null, 2) + '\n';

function main(argv) {
  const saida = path.join(RAIZ_PADRAO, SAIDA_REL);
  const conteudo = serializar(gerarRotas(RAIZ_PADRAO));
  if (argv.includes('--check')) {
    const atual = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
    if (atual !== conteudo) {
      console.error(
        `${SAIDA_REL} desatualizado: rode node scripts/inventario/gerar-rotas.mjs e commite o resultado.`
      );
      process.exit(1);
    }
    console.log(`${SAIDA_REL} em dia.`);
    return;
  }
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, conteudo);
  const r = JSON.parse(conteudo).resumo;
  console.log(
    `rotas.json: ${r.urls} URLs (${r.rotas_com_pagina} com pagina, ${r.redirecionamentos} redirecionamentos), ` +
      `${r.itens_de_menu} itens de menu, ${r.hooks_distintos} hooks, ${r.problemas} problemas.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2));
