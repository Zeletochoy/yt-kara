import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        WebSocket: 'readonly',
        MediaSource: 'readonly',
        AbortController: 'readonly',
        Uint8Array: 'readonly',
        QRCode: 'readonly',
        wsConnection: 'readonly',
        MSEPlayer: 'readonly',
        confirm: 'readonly',

        // Node globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        setImmediate: 'readonly'
      }
    },
    rules: {
      'indent': ['error', 2],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off',
      'no-trailing-spaces': 'error',
      'comma-dangle': ['error', 'never'],
      'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
      'keyword-spacing': 'error',
      'space-before-blocks': 'error',
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'no-multiple-empty-lines': ['error', { 'max': 2 }],
      'eol-last': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error'
    }
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'data/**',
      '*.min.js',
      'coverage/**',
      'dist/**',
      '.git/**'
    ]
  }
];
