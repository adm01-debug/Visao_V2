/**
 * Generate version.json — embeds __APP_BUILD_ID__ at build time
 * so startBuildVersionWatcher can detect stale bundles.
 *
 * Usage: node scripts/generate-version-json.mjs
 * Called automatically after vite build via package.json scripts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const jsDir = resolve(distDir, 'assets');
const versionPath = resolve(distDir, 'version.json');

// Extract build ID from compiled JS assets
try {
  const files = readdirSync(jsDir).filter((f) => f.endsWith('.js') && f.startsWith('index-'));
  let buildId = 'unknown';

  for (const file of files) {
    const content = readFileSync(resolve(jsDir, file), 'utf-8');
    // Look for the injected __APP_BUILD_ID__ value
    const match = content.match(/"__APP_BUILD_ID__":"([a-f0-9]+)"/);
    if (match) {
      buildId = match[1];
      break;
    }
  }

  writeFileSync(versionPath, JSON.stringify({ buildId, timestamp: Date.now() }));
  console.log(`[version.json] Generated: buildId=${buildId}`);
} catch (err) {
  console.warn('[version.json] Could not generate:', err.message);
  writeFileSync(versionPath, JSON.stringify({ buildId: 'unknown', timestamp: Date.now() }));
}
