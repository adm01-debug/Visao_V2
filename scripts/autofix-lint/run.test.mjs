import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { selectFiles, assertBranch, fixAndCheck } from './run.mjs';

function fixture(t) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'autofix-regressao-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  function git(...args) {
    const result = spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, HUSKY: '0' },
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  function write(file, content) {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  }
  git('init', '--quiet');
  git('config', 'user.name', 'Fixture local');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'core.hooksPath', '/dev/null');
  for (const file of ['src/removed.ts', 'src/renamed.ts', 'src/changed.ts', 'docs/ignored.ts'])
    write(file, 'export const value = 0;\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'base');
  const base = git('rev-parse', 'HEAD');
  rmSync(path.join(cwd, 'src/removed.ts'));
  renameSync(path.join(cwd, 'src/renamed.ts'), path.join(cwd, 'src/new name.ts'));
  write('src/changed.ts', 'export const value = 1;\n');
  write('docs/ignored.ts', 'export const value = 1;\n');
  write('src/linha\nnova.ts', 'export const novo = 1;\n');
  write('src/arquivo ; echo perigoso.ts', 'export const novo = 1;\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'mudancas');
  write(
    'node_modules/eslint/bin/eslint.js',
    `const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n');
const failed = args.some(arg => { try { return fs.readFileSync(arg, 'utf8').includes('UNFIXABLE'); } catch { return false; } });
process.exit(failed ? 1 : 0);
`
  );
  return {
    cwd,
    base,
    git,
    write,
    calls: () =>
      readFileSync(path.join(cwd, 'calls.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
  };
}

test('selecao exclui delecoes e preserva renomeados e nomes especiais', (t) => {
  const f = fixture(t);
  const files = selectFiles(f.cwd, f.base);
  assert.deepEqual(
    files.sort(),
    [
      'src/changed.ts',
      'src/new name.ts',
      'src/linha\nnova.ts',
      'src/arquivo ; echo perigoso.ts',
    ].sort()
  );
});

test('executa verificacao sem fix depois de corrigir, com argv seguro', (t) => {
  const f = fixture(t);
  fixAndCheck(f.cwd, ['src/arquivo ; echo perigoso.ts']);
  const calls = f.calls();
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('--fix'));
  assert.ok(!calls[1].includes('--fix'));
  assert.equal(calls[1].at(-1), 'src/arquivo ; echo perigoso.ts');
  assert.ok(calls[1].some((arg) => arg.startsWith('--max-warnings')));
  assert.deepEqual(calls[0].slice(0, 3), ['--fix', '--fix-type', 'layout']);
});

test('erro nao corrigivel bloqueia mesmo sem diff', (t) => {
  const f = fixture(t);
  f.write('src/changed.ts', 'UNFIXABLE');
  assert.throws(() => fixAndCheck(f.cwd, ['src/changed.ts']), /pos-fix falhou/);
  assert.equal(f.calls().length, 2);
});

test('main e develop sao bloqueadas incluindo refs completas', () => {
  for (const name of [
    'main',
    'develop',
    'refs/heads/main',
    'refs/heads/develop',
    '',
    '--all',
    'refs/tags/main',
  ])
    assert.throws(() => assertBranch(name));
  assert.equal(assertBranch('refs/heads/fix/seguro'), 'fix/seguro');
});

test('erro de configuracao aborta sem apresentar resultado limpo', (t) => {
  const f = fixture(t);
  f.write('node_modules/eslint/bin/eslint.js', 'process.exit(2);\n');
  assert.throws(() => fixAndCheck(f.cwd, ['src/changed.ts']), /fix falhou \(2\)/);
});

test('workflow publica somente patch apos verificacoes obrigatorias', () => {
  const workflow = readFileSync(
    new URL('../../.github/workflows/lint-autofix.yml', import.meta.url),
    'utf8'
  );
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /git push|git commit|skip ci|continue-on-error/);
  assert.ok(
    workflow.indexOf('run: node scripts/autofix-lint/run.mjs') <
      workflow.indexOf('run: npm run type-check:strict')
  );
  assert.ok(
    workflow.indexOf('run: npm run type-check:strict') <
      workflow.indexOf('uses: actions\/upload-artifact')
  );
});
