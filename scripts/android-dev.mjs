import net from 'node:net';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const args = new Set(process.argv.slice(2));
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const port = Number(process.env.ANDROID_WEB_PORT ?? '3000');
const devHost = process.env.ANDROID_DEV_HOST ?? '0.0.0.0';
const healthHost = process.env.ANDROID_HEALTH_HOST ?? '127.0.0.1';
const serverUrl = process.env.CAP_SERVER_URL?.trim() || `http://10.0.2.2:${port}`;
const shouldOpenStudio = !args.has('--no-open');
const shouldExitAfterSync = args.has('--exit-after-sync');

let devProcess;

const quoteWindowsArg = (value) => {
  const stringValue = `${value}`;
  if (!/[ \t"]/u.test(stringValue)) return stringValue;

  return `"${stringValue
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\+)$/g, '$1$1')}"`;
};

const createSpawnTarget = (command, commandArgs) => {
  if (process.platform !== 'win32') {
    return {
      command,
      args: commandArgs,
      options: { shell: false },
    };
  }

  const fullCommand = [command, ...commandArgs].map(quoteWindowsArg).join(' ');
  return {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', fullCommand],
    options: { shell: false },
  };
};

const run = (command, commandArgs, extra = {}) =>
  new Promise((resolve, reject) => {
    const target = createSpawnTarget(command, commandArgs);
    const child = spawn(target.command, target.args, {
      stdio: 'inherit',
      ...target.options,
      ...extra,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code ?? 'unknown'}.`));
    });
  });

const waitForPort = async (host, targetPort, timeoutMs = 120000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const isReady = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port: targetPort });

      socket.on('connect', () => {
        socket.end();
        resolve(true);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (isReady) return;
    await delay(1000);
  }

  throw new Error(`The Next.js server was not ready on ${host}:${targetPort} after ${timeoutMs / 1000} seconds.`);
};

const stopDevServer = async () => {
  if (!devProcess || devProcess.exitCode !== null || !devProcess.pid) return;

  if (process.platform === 'win32') {
    try {
      await run('taskkill', ['/pid', `${devProcess.pid}`, '/t', '/f'], { stdio: 'ignore' });
    } catch {
      // Ignore cleanup failures on exit.
    }
    return;
  }

  devProcess.kill('SIGINT');
};

const syncAndroid = async () => {
  await run(npxCommand, ['cap', 'sync', 'android'], {
    env: {
      ...process.env,
      CAP_SERVER_URL: serverUrl,
    },
  });
};

const openAndroidStudio = async () => {
  await run(npxCommand, ['cap', 'open', 'android'], {
    env: {
      ...process.env,
      CAP_SERVER_URL: serverUrl,
    },
  });
};

const handleShutdown = async () => {
  await stopDevServer();
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

const main = async () => {
  const nextDevArgs = ['next', 'dev', '--webpack', '-H', devHost, '-p', `${port}`];
  const devTarget = createSpawnTarget(npxCommand, nextDevArgs);
  devProcess = spawn(devTarget.command, devTarget.args, {
    ...devTarget.options,
    stdio: 'inherit',
    env: process.env,
  });

  devProcess.on('error', async (error) => {
    console.error(`[android:dev] Could not start Next.js: ${error.message}`);
    await stopDevServer();
    process.exit(1);
  });

  devProcess.on('close', (code) => {
    if (!shouldExitAfterSync && code !== null && code !== 0) {
      console.error(`[android:dev] The Next.js server stopped with code ${code}.`);
      process.exit(code);
    }
  });

  await waitForPort(healthHost, port);
  await syncAndroid();

  if (shouldOpenStudio) {
    await openAndroidStudio();
  }

  console.log(`[android:dev] Android will load the app from ${serverUrl}.`);
  console.log('[android:dev] Keep this terminal open while you work. Changes in VS Code will refresh inside the Android app.');

  if (shouldExitAfterSync) {
    await stopDevServer();
    return;
  }

  await new Promise((resolve) => {
    devProcess.on('close', resolve);
  });
};

main().catch(async (error) => {
  console.error(`[android:dev] ${error.message}`);
  await stopDevServer();
  process.exit(1);
});
