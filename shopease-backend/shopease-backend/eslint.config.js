const globals = {
  process: 'readonly',
  __dirname: 'readonly',
  require: 'readonly',
  module: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  clearTimeout: 'readonly',
  clearInterval: 'readonly',
};

module.exports = [
  {
    ignores: ['node_modules/**', 'seed/**'],
  },
  {
    files: ['**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-class-members': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-unreachable-loop': 'error',
      'no-constant-condition': 'warn',
      'no-return-await': 'warn',
      'require-await': 'warn',
      'yoda': 'warn',
    },
  },
];
