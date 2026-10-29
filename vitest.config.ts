import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['games/**/*.test.ts', 'server/**/*.test.ts'] } });
