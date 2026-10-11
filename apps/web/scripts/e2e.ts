/** Builds the site with test configuration in release mode, then runs Playwright. */
import { spawnSync } from 'node:child_process';
import { e2eEnv } from '../tests/e2e.env.ts';

const env = { ...process.env, ...e2eEnv, BINDERREADY_RELEASE: '1' };
const run = (cmd: string, args: string[]) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
if (!process.argv.includes('--no-build')) run('pnpm', ['exec', 'next', 'build']);
run('pnpm', [
  'exec',
  'playwright',
  'test',
  ...process.argv.slice(2).filter((a) => a !== '--no-build'),
]);
