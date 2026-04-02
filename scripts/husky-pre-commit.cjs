/**
 * Husky pre-commit runner: Node-only subprocesses (no npx / bash / readlink).
 * Git runs hooks with cwd = repo root.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function runNode(scriptRelative) {
  const scriptPath = path.join(root, scriptRelative);
  const r = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function runGit(args) {
  const r = spawnSync('git', args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log('Copying .well-known/ contents');
runNode(path.join('scripts', 'copy-wellknown.cjs'));

runGit(['add', 'apps/remix/public']);

const lintStaged = path.join(root, 'node_modules', 'lint-staged', 'bin', 'lint-staged.js');
if (!fs.existsSync(lintStaged)) {
  console.error('lint-staged not found. Run pnpm install.');
  process.exit(1);
}

const ls = spawnSync(process.execPath, [lintStaged], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
if (ls.error) {
  console.error(ls.error);
  process.exit(1);
}
process.exit(ls.status ?? 0);
