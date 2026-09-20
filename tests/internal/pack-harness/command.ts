import { spawnSync } from 'node:child_process'

export function runCommand(
  cwd: string,
  command: string,
  args: string[],
  env: Record<string, string> = {},
): { ok: boolean; output: string } {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  return { ok: result.status === 0, output }
}
