/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works on GitHub Pages (/bsb-igra/) and locally.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    // rules/ runs on the Firebase emulator (npm run test:rules), e2e/ in a real browser
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: { include: ['src/**'], exclude: ['src/test/**', 'src/**/*.test.*', 'src/data/**'] },
  },
})
