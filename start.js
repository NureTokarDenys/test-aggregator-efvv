const { spawn, execSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const readline = require('readline');

const SAVER_PORT = 3001;
const REACT_PORT = 3000;
const isWin = process.platform === 'win32';

let saverProcess = null;
let reactProcess = null;
let shuttingDown = false;
const managedPids = new Set();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(true));
    tester.once('listening', () => tester.close(() => resolve(false)));
    tester.listen(port);
  });
}

function lineListensOnPort(line, port) {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 4 || !/LISTENING/i.test(tokens[3])) return false;
  const localAddress = tokens[1] || '';
  return localAddress.endsWith(`:${port}`) || localAddress.includes(`]:${port}`);
}

function getPidsOnPort(port) {
  const pids = new Set();

  if (isWin) {
    try {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      for (const line of output.split(/\r?\n/)) {
        if (!lineListensOnPort(line, port)) continue;
        const pid = line.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid) && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
    } catch {
      // Port not in use.
    }
    return [...pids];
  }

  try {
    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' });
    for (const pid of output.split(/\r?\n/)) {
      if (pid && pid !== String(process.pid)) pids.add(pid.trim());
    }
  } catch {
    // Port not in use.
  }
  return [...pids];
}

function getProcessName(pid) {
  try {
    if (isWin) {
      const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' }).trim();
      if (!out || /no tasks/i.test(out)) return 'невідомий процес';
      const match = out.match(/^"([^"]+)"/);
      return match ? match[1] : out.split(',')[0];
    }
    return execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim() || 'невідомий процес';
  } catch {
    return 'невідомий процес';
  }
}

function askYesNo(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(/^(y|yes|т|так)$/i.test(answer.trim()));
    });
  });
}

function killPidTree(pid) {
  if (!pid) return;
  try {
    if (isWin) {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(Number(pid), 'SIGTERM');
    }
  } catch {
    // Process may already be gone.
  }
}

async function ensurePortAvailable(port, label) {
  const pids = getPidsOnPort(port);
  if (pids.length === 0) return true;

  console.log(`\n⚠️  Порт ${port} (${label}) зайнятий:`);
  for (const pid of pids) {
    console.log(`   • PID ${pid} — ${getProcessName(pid)}`);
  }

  const shouldKill = await askYesNo(
    `Завершити ці процеси, щоб звільнити порт ${port}? (y/n): `
  );

  if (!shouldKill) {
    console.log(
      `\n❌ Запуск скасовано. Звільніть порт ${port} вручну або підтвердіть завершення при наступному запуску.`
    );
    return false;
  }

  console.log(`🔄 Завершення процесів на порту ${port}...`);
  pids.forEach(killPidTree);
  await sleep(500);

  if (await isPortInUse(port)) {
    console.log(`❌ Порт ${port} досі зайнятий. Запуск неможливий.`);
    return false;
  }

  return true;
}

function buildReactEnv() {
  const extraWarnings = [
    '--disable-warning=DEP_WEBPACK_DEV_SERVER_ON_AFTER_SETUP_MIDDLEWARE',
    '--disable-warning=DEP_WEBPACK_DEV_SERVER_ON_BEFORE_SETUP_MIDDLEWARE',
  ];
  const nodeOptions = [process.env.NODE_OPTIONS, ...extraWarnings].filter(Boolean).join(' ');
  return { ...process.env, NODE_OPTIONS: nodeOptions, PORT: String(REACT_PORT) };
}

function registerManagedChild(child) {
  if (child?.pid) managedPids.add(String(child.pid));
  child.on('spawn', () => {
    if (child.pid) managedPids.add(String(child.pid));
  });
  return child;
}

function spawnSaver() {
  return spawn(process.execPath, [path.join(__dirname, 'saver.js')], {
    stdio: 'inherit',
    windowsHide: true,
  });
}

function spawnReact() {
  const reactScripts = path.join(__dirname, 'node_modules', 'react-scripts', 'bin', 'react-scripts.js');
  if (!fs.existsSync(reactScripts)) {
    throw new Error('react-scripts не знайдено. Спочатку виконайте: npm install');
  }

  // Direct node spawn avoids cmd.exe "Terminate batch job (Y/N)?" on Ctrl+C.
  return spawn(process.execPath, [reactScripts, 'start'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: buildReactEnv(),
    windowsHide: true,
  });
}

function killChildProcess(child) {
  if (!child?.pid) return;
  killPidTree(child.pid);
}

async function verifyPortsFreed() {
  await sleep(300);
  const busy = [];
  if (await isPortInUse(SAVER_PORT)) busy.push(String(SAVER_PORT));
  if (await isPortInUse(REACT_PORT)) busy.push(String(REACT_PORT));
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('\n🛑 Зупинка процесів...');

  killChildProcess(reactProcess);
  killChildProcess(saverProcess);
  for (const pid of managedPids) killPidTree(pid);

  await verifyPortsFreed();
  process.exit(exitCode);
}

async function main() {
  console.log('🚀 Запуск Test Aggregator...');

  if (!(await ensurePortAvailable(SAVER_PORT, 'saver.js — API бази даних'))) {
    process.exit(1);
  }
  if (!(await ensurePortAvailable(REACT_PORT, 'React dev server'))) {
    process.exit(1);
  }

  saverProcess = registerManagedChild(spawnSaver());
  reactProcess = registerManagedChild(spawnReact());

  process.on('SIGINT', () => {
    shutdown(0).catch(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    shutdown(0).catch(() => process.exit(0));
  });

  saverProcess.on('error', (err) => {
    console.error('❌ Не вдалося запустити saver.js:', err.message);
    shutdown(1).catch(() => process.exit(1));
  });

  reactProcess.on('error', (err) => {
    console.error('❌ Не вдалося запустити React:', err.message);
    shutdown(1).catch(() => process.exit(1));
  });

  saverProcess.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (code !== 0 && code !== null) {
      console.error(`\n⚠️ saver.js завершився (${code ?? signal})`);
    }
    shutdown(code ?? 1).catch(() => process.exit(code ?? 1));
  });

  reactProcess.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shutdown(code ?? 0).catch(() => process.exit(code ?? 0));
  });
}

main().catch((err) => {
  console.error('❌ Помилка запуску:', err.message || err);
  process.exit(1);
});
