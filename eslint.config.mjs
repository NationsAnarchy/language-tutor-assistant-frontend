import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,

  globalIgnores(['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts']),

  {
    // Fail on stale eslint-disable comments so they don't accumulate.
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // Remote OAuth avatars and user-controlled markdown images are rendered
      // with plain <img> on purpose (see next.config.mjs `images.unoptimized`),
      // so next/image is not a drop-in replacement here.
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
])
