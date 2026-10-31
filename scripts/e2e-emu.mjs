import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { createServer } from 'node:net'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const children = new Set()
const port = 5174
const dist = 'node_modules/.cache/druzina-e2e-dist'
const base = `http://127.0.0.1:${port}/`
const allowedFlows = ['play', 'blef', 'wave', 'kviz', 'lic', 'misija', 'cija', 'recovery']
const requested = process.env.E2E_GAME
assert.ok(!requested || allowedFlows.includes(requested), `Unknown E2E_GAME: ${requested}`)
const flows = requested ? [requested] : allowedFlows
function start(command, args, env = {}) {
  const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, ...env }, detached: process.platform !== 'win32' })
  children.add(child)
  child.once('exit', () => children.delete(child))
  return child
}
function stop(child) {
  if (child.exitCode !== null) return
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { process.kill(-child.pid, 'SIGTERM') } catch { /* already stopped */ } }
}
async function run(command, args, timeout, env) {
  const child = start(command, args, env)
  const timer = setTimeout(() => stop(child), timeout)
  try {
    const [code, signal] = await once(child, 'exit')
    if (code !== 0) throw new Error(`${command} ${args.join(' ')} failed (${signal ?? code})`)
  } finally { clearTimeout(timer) }
}
async function free(port) {
  const server = createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve))
  await new Promise(resolve => server.close(resolve))
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  for (const child of children) stop(child)
  process.exitCode = 1
})
try {
  if (!process.argv.includes('--flows')) {
    // Refuse to reuse anyone else's emulator or app server; all resources belong to this run.
    for (const value of [port, 9000, 9099, 4400, 4500]) await free(value)
    await run(process.execPath, ['node_modules/typescript/bin/tsc', '-b'], 120000)
    await run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', dist], 120000)
    const npx = process.platform === 'win32' ? 'cmd.exe' : 'npx'
    const args = ['-y', 'firebase-tools@14', 'emulators:start', '--only', 'auth,database', '--project', 'demo-uljez']
    const firebase = start(npx, process.platform === 'win32' ? ['/d', '/s', '/c', 'npx', ...args] : args)
    try {
      const deadline = Date.now() + 120000
      while (true) {
        if (firebase.exitCode !== null) throw new Error('Firebase emulators exited during startup')
        try {
          const services = await fetch('http://127.0.0.1:4400/emulators').then(r => r.json())
          if (services.auth?.port === 9099 && services.database?.port === 9000) {
            await fetch('http://127.0.0.1:9099/')
            await fetch('http://127.0.0.1:9000/.json?ns=demo-uljez')
            break
          }
        } catch { /* downloading or starting */ }
        if (Date.now() > deadline) throw new Error('Firebase emulators did not become ready')
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      await run(process.execPath, [resolve('scripts/e2e-emu.mjs'), '--flows'], 20 * 60000, {
        GCLOUD_PROJECT: 'demo-uljez', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000',
      })
    } finally { stop(firebase) }
  } else {
    if (process.env.GCLOUD_PROJECT !== 'demo-uljez' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIREBASE_DATABASE_EMULATOR_HOST !== '127.0.0.1:9000') throw new Error('Expected demo-uljez Auth and Database emulators on loopback')
    // The app uses ns=demo-uljez; the CLI may load only demo-uljez-default-rtdb.
    // Configure the exact tested namespace before phones connect. Test requests use real phone tokens.
    const rules = await fetch('http://127.0.0.1:9000/.settings/rules.json?ns=demo-uljez', {
      method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: await readFile('database.rules.json', 'utf8'),
    })
    assert.equal(rules.status, 200, `Cannot install emulator rules: ${await rules.text()}`)
    assert.equal((await fetch('http://127.0.0.1:9000/rooms/probe/pub.json?ns=demo-uljez')).status, 401, 'Emulator namespace must deny unauthenticated reads')
    const server = start(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(port), '--strictPort'])
    const deadline = Date.now() + 30000
    while (true) {
      if (server.exitCode !== null) throw new Error('Preview server exited')
      try { if ((await fetch(base)).ok) break } catch { /* starting */ }
      if (Date.now() > deadline) throw new Error('Preview server did not become ready')
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    try {
      for (const game of flows) {
        console.log(`== emulator: ${game}`)
        // Each script expects an empty game/history dataset. Previous phones are already closed.
        const reset = await fetch('http://127.0.0.1:9000/.json?ns=demo-uljez', {
          method: 'DELETE', headers: { Authorization: 'Bearer owner' },
        })
        assert.equal(reset.status, 200, 'Cannot reset the isolated emulator dataset')
        await run(process.execPath, [`e2e/${game}.mjs`, `${process.env.OUT ?? 'e2e/shots-emu'}/${game}`], 5 * 60000, { MODE: 'emu', BASE: base, COMPLETE: '1' })
      }
    } finally { stop(server) }
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  for (const child of children) stop(child)
}
