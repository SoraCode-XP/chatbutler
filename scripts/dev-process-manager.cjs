#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = process.cwd();
const stateDir = path.join(root, '.runtime');
const stateFile = path.join(stateDir, 'dev-processes.json');

const services = [
  { name: 'web', args: ['dev:web'] },
  { name: 'server', args: ['dev:server'] },
  { name: 'admin', args: ['dev:admin'] },
];

function ensureStateDir() {
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
}

function readState() {
  if (!fs.existsSync(stateFile)) {
    return { processes: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { processes: [] };
  }
}

function writeState(state) {
  ensureStateDir();
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function removeStateFile() {
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function spawnService(service) {
  let child;

  if (process.platform === 'win32') {
    child = spawn('cmd.exe', ['/d', '/s', '/c', `pnpm ${service.args.join(' ')}`], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    child = spawn('pnpm', service.args, {
      cwd: root,
      detached: true,
      stdio: 'ignore',
    });
  }

  child.unref();

  return {
    name: service.name,
    pid: child.pid,
    command: `pnpm ${service.args.join(' ')}`,
    startedAt: new Date().toISOString(),
  };
}

function stopPid(pid) {
  if (process.platform === 'win32') {
    const res = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return res.status === 0;
  }

  try {
    process.kill(-pid, 'SIGTERM');
    return true;
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
      return true;
    } catch {
      return false;
    }
  }
}

function startAll() {
  const current = readState();
  const alive = (current.processes || []).filter((p) => Number.isInteger(p.pid) && isAlive(p.pid));

  if (alive.length > 0) {
    console.log('Detected running managed dev processes:');
    alive.forEach((p) => console.log(`- ${p.name} (PID ${p.pid})`));
    console.log('Run "pnpm dev:stop" first, then start again.');
    process.exit(1);
  }

  const started = services.map(spawnService);
  writeState({ processes: started });

  console.log('Started managed dev processes in background:');
  started.forEach((p) => console.log(`- ${p.name}: PID ${p.pid}`));
  console.log('Use "pnpm dev:stop" to stop them regardless of runtime ports.');
}

function stopAll() {
  const state = readState();
  const processes = state.processes || [];

  if (processes.length === 0) {
    console.log('No managed dev processes found.');
    return;
  }

  let stopped = 0;
  let missing = 0;

  for (const p of processes) {
    if (!Number.isInteger(p.pid) || !isAlive(p.pid)) {
      missing += 1;
      continue;
    }

    if (stopPid(p.pid)) {
      stopped += 1;
    }
  }

  removeStateFile();
  console.log(`Stopped ${stopped} process(es). ${missing} already exited.`);
}

function statusAll() {
  const state = readState();
  const processes = state.processes || [];

  if (processes.length === 0) {
    console.log('No managed dev processes found.');
    return;
  }

  console.log('Managed dev process status:');
  for (const p of processes) {
    const alive = Number.isInteger(p.pid) && isAlive(p.pid);
    console.log(`- ${p.name}: PID ${p.pid} - ${alive ? 'running' : 'stopped'}`);
  }
}

const action = process.argv[2] || 'status';

if (action === 'start') {
  startAll();
} else if (action === 'stop') {
  stopAll();
} else if (action === 'status') {
  statusAll();
} else {
  console.error('Unknown action. Use: start | stop | status');
  process.exit(1);
}
