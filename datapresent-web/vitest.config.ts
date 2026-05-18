import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/lib/**/*.tsx',
        'src/hooks/**/*.ts',
        'src/hooks/**/*.tsx',
        'src/i18n/**/*.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/lib/prisma.ts',
        'src/lib/r2.ts',
        'src/lib/queue/client.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
