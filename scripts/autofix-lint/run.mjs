import { spawnSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git falhou (${result.status}): ${result.stderr.trim()}`);
  return result.stdout;
}

export function assertBranch(branch) {
  const normalized = branch?.replace(/^refs\/heads\//, '');
  if (!normalized || normalized === 'main' || normalized === 'develop' || normalized.startsWith('refs/') || normalized.startsWith('-') || /\s/.test(normalized)) {
    throw new Error('Autofix exige branch de trabalho; main/develop sao proibidas.');
  }
  return normalized;
}

export function selectFiles(cwd, base = 'HEAD^') {
  if (base !== 'HEAD^' && !/^[a-f\d]{40}$/i.test(base)) throw new Error('SHA base invalido.');
  return git(cwd, ['diff', '--name-only', '-z', '--diff-filter=ACMR', `${base}...HEAD`, '--'])
    .split('\0')
    .filter((file) => /^(src|tests|scripts|supabase\/functions)\/[\s\S]+\.(?:[cm]?[jt]s|[jt]sx)$/.test(file));
}

export function fixAndCheck(cwd, files) {
  if (files.length === 0) return;
  const executable = path.join(cwd, 'node_modules/eslint/bin/eslint.js');
  for (const fixing of [true, false]) {
    const args = [executable, ...(fixing ? ['--fix', '--fix-type', 'layout'] : []), '--max-warnings=0', '--no-warn-ignored', '--', ...files];
    const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0 && !(fixing && result.status === 1)) {
      throw new Error(`ESLint ${fixing ? 'fix' : 'pos-fix'} falhou (${result.status ?? result.signal}).`);
    }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    assertBranch(process.env.AUTOFIX_BRANCH);
    const cwd = process.cwd();
    const files = selectFiles(cwd, process.env.AUTOFIX_BASE_SHA || 'HEAD^');
    fixAndCheck(cwd, files);
    const patch = files.length ? git(cwd, ['diff', '--binary', '--', ...files]) : '';
    if (!process.env.AUTOFIX_PATCH_PATH || !process.env.GITHUB_OUTPUT) throw new Error('Caminhos de saida obrigatorios.');
    writeFileSync(process.env.AUTOFIX_PATCH_PATH, patch);
    appendFileSync(process.env.GITHUB_OUTPUT, `has_files=${files.length > 0}\nchanged=${patch.length > 0}\ncount=${files.length}\n`);
  } catch (error) {
    console.error(`ERRO no autofix: ${error.message}`);
    process.exitCode = 1;
  }
}
