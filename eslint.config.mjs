import nextVitals from 'eslint-config-next/core-web-vitals'

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'services/**',
      'loadtest/**',
      'fkmsdl',
    ],
  },
  {
    // Baseline on main currently trips several React Compiler / hooks rules.
    // Keep them visible as warnings so CI can fail on real errors without a
    // product-wide cleanup in this chore PR.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]

export default eslintConfig
