/**
 * When package.json files are staged: refresh lockfile and re-stage it.
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

function runNpmInstall() {
  const npm = spawnSync('npm', ['install'], {
    cwd: root,
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });
  if (!npm.error && npm.status !== null) {
    return npm.status;
  }

  console.error('Could not run npm install. Install Node 18+ and ensure npm is on PATH.');
  console.error('Node binary:', process.execPath);
  return 1;
}

const code = runNpmInstall();
if (code !== 0) {
  process.exit(code);
}

const git = spawnSync('git', ['add', 'package.json', 'package-lock.json'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
process.exit(git.status ?? 0);
