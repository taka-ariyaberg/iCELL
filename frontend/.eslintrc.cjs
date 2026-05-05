/* eslint-env node */
// ESLint v8 legacy config matching the pinned eslint@8 toolchain.
//
// Phase 0 mandate: "Start permissive — tighten later." Several rules are
// intentionally disabled here because the violations live in Phase 5's
// scope (kill `any`, type API responses) and Phase 4's scope (extract
// reusable component primitives). Re-enable each disabled rule in the
// phase that fixes the underlying issue:
//   - @typescript-eslint/no-explicit-any  → re-enable in Phase 5
//   - react-refresh/only-export-components → re-enable in Phase 4
//   - react-hooks/exhaustive-deps          → re-enable in Phase 5
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-refresh'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'react-refresh/only-export-components': 'off',
    'react-hooks/exhaustive-deps': 'off',
    // File-size guard. Warn at 500 lines (skip blanks + comments); files
    // currently over the threshold are listed in the audit and drained by
    // Phase 7. When that allowlist is empty, flip 'warn' → 'error'.
    'max-lines': [
      'warn',
      { max: 500, skipBlankLines: true, skipComments: true },
    ],
  },
};