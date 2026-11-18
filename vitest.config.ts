import {defineConfig} from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: {tsconfigPaths: true},
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Só ativa com --coverage (npm run test:cov); o modo watch fica sem overhead.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.spec.ts',
      ],
    },
  },
});
