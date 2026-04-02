/**
 * When package.json files are staged: refresh lockfile and re-stage it.
 * Uses Corepack next to the same Node that runs this script (GitHub Desktop
 * often omits pnpm/corepack from PATH).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const env = {
  ...process.env,
  PATH: [path.join(root, 'node_modules', '.bin'), process.env.PATH || '']
    .filter(Boolean)
    .join(path.delimiter),
};

function corepackCandidates() {
  const nodeDir = path.dirname(process.execPath);
  if (process.platform === 'win32') {
    return [path.join(nodeDir, 'corepack.cmd'), path.join(nodeDir, 'corepack')];
  }
  return [path.join(nodeDir, 'corepack')];
}

function runPnpmInstall() {
  for (const corepackExe of corepackCandidates()) {
    if (!fs.existsSync(corepackExe)) {
      continue;
    }
    // shell:false: on Windows, spawn can run .cmd directly; shell:true breaks paths with spaces (e.g. Program Files).
    const r = spawnSync(corepackExe, ['pnpm', 'install'], {
      cwd: root,
      stdio: 'inherit',
      env,
      shell: false,
    });
    if (r.error) {
      continue;
    }
    return r.status ?? 0;
  }

  const shell = process.platform === 'win32';
  const fromPath = spawnSync('corepack', ['pnpm', 'install'], {
    cwd: root,
    stdio: 'inherit',
    env,
    shell,
  });
  if (!fromPath.error && fromPath.status !== null) {
    return fromPath.status;
  }

  const pnpm = spawnSync('pnpm', ['install'], {
    cwd: root,
    stdio: 'inherit',
    env,
    shell,
  });
  if (!pnpm.error && pnpm.status !== null) {
    return pnpm.status;
  }

  console.error('Could not run pnpm install. Install Node 18+ and run: corepack enable');
  console.error('Node binary:', process.execPath);
  return 1;
}

const code = runPnpmInstall();
if (code !== 0) {
  process.exit(code);
}

const git = spawnSync('git', ['add', 'package.json', 'pnpm-lock.yaml'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
process.exit(git.status ?? 0);
