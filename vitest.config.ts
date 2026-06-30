import { defineConfig } from 'vitest/config';
import path from 'path';

// Config mínima para testes unitários de serviços (Node + alias @/ → src).
// Os e2e (Playwright) seguem em tests/ com seu próprio config.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
