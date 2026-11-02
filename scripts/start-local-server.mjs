import { spawn } from 'node:child_process'
import { mkdirSync, openSync, closeSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const project = fileURLToPath(new URL('../', import.meta.url))
const port = Number(process.argv[2])
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port')
const vite = path.join(project, 'node_modules', 'vite', 'bin', 'vite.js')
if (!existsSync(vite)) throw new Error('Run npm install in the birthday-lab folder first')

const runtime = path.join(project, '.local', 'launcher')
mkdirSync(runtime, { recursive: true })
const stdout = openSync(path.join(runtime, `server-${port}.log`), 'a')
const stderr = openSync(path.join(runtime, `server-${port}.error.log`), 'a')
const child = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: project,
  detached: true,
  windowsHide: true,
  stdio: ['ignore', stdout, stderr],
})
child.on('error', error => { writeFileSync(path.join(runtime, `server-${port}.error.log`), error.stack); process.exitCode = 1 })
child.on('spawn', () => {
  writeFileSync(path.join(runtime, `server-${port}.json`), JSON.stringify({
    pid: child.pid, port, url: `http://127.0.0.1:${port}/`, project, startedAt: new Date().toISOString(),
  }, null, 2))
})
child.unref()
closeSync(stdout)
closeSync(stderr)
