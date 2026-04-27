import { spawn } from 'node:child_process'

function spawnWorkspaceDev(command, args) {
  return spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: true,
  })
}

const frontend = spawnWorkspaceDev('npm', ['run', 'dev:frontend'])
const backend = spawnWorkspaceDev('npm', ['run', 'dev:backend'])

let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  for (const proc of [frontend, backend]) {
    if (!proc.killed) {
      proc.kill('SIGTERM')
    }
  }

  setTimeout(() => {
    process.exit(code)
  }, 250)
}

frontend.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    shutdown(code ?? 1)
  }
})

backend.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    shutdown(code ?? 1)
  }
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
