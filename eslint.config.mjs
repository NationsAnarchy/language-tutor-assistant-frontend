import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  { ignores: ['.next/**', 'coverage/**', 'node_modules/**'] },
  {
    rules: {
      // Existing client lifecycle code intentionally resets local state when
      // a session or authentication boundary changes.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]

export default config
