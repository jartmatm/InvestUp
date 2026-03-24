import { spawn } from 'node:child_process';
import process from 'node:process';

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

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

await run(npxCommand, ['cap', 'sync', 'android'], {
  env: process.env,
});
