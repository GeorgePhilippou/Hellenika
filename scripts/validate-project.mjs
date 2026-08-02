/* ============================================================
   Hellenika — consolidated project validation
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const checks = [
  'scripts/validate-content.mjs',
  'scripts/validate-geo.mjs',
  'scripts/validate-journeys.mjs',
  'scripts/validate-map-lifecycle.mjs',
  'scripts/verify-content.mjs',
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const check of checks) run(process.execPath, [check]);

const syntaxDirs = ['js', 'data', 'scripts'];
const syntaxFiles = [];
for (const dir of syntaxDirs) {
  const pending = [path.join(ROOT, dir)];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (/\.(?:js|mjs)$/.test(entry.name)) syntaxFiles.push(target);
    }
  }
}

for (const file of syntaxFiles.sort()) run(process.execPath, ['--check', file]);
run('git', ['diff', '--check']);

console.log(`Project validation passed: ${checks.length} suites and ${syntaxFiles.length} syntax checks.`);
