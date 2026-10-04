/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// One id per build: the commit plus the build time. The running app compares it with version.json to spot a new deploy.
function buildId(): string {
  let sha = process.env.GITHUB_SHA?.slice(0, 7) ?? ''
  if (!sha) {
    try {
      sha = execSync('git rev-parse --short HEAD').toString().trim()
    } catch {
      sha = 'dev'
    }
  }
  return `${sha}-${Date.now().toString(36)}`
}
const BUILD_ID = buildId()

// Writes version.json and the service worker (stamped with the build id) next to the built app.
function pwa(): Plugin {
  return {
    name: 'druzina-pwa',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
      const sw = readFileSync(new URL('./pwa/sw.js', import.meta.url), 'utf8').replace('__BUILD_ID__', BUILD_ID)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw })
    },
  }
}

// Relative base so the build works on GitHub Pages (/bsb-igra/) and locally.
export default defineConfig({
  base: './',
  plugins: [react(), pwa()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  test: {
    // rules/ runs on the Firebase emulator (npm run test:rules), e2e/ in a real browser
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: { include: ['src/**'], exclude: ['src/test/**', 'src/**/*.test.*', 'src/data/**'] },
  },
})
