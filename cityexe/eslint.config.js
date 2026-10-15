export default [
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly', performance: 'readonly', requestAnimationFrame: 'readonly', addEventListener: 'readonly', removeEventListener: 'readonly', innerWidth: 'readonly', innerHeight: 'readonly', localStorage: 'readonly', indexedDB: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', location: 'readonly', history: 'readonly', confirm: 'readonly', console: 'readonly', Blob: 'readonly', Response: 'readonly', CompressionStream: 'readonly', DecompressionStream: 'readonly', URLSearchParams: 'readonly', Date: 'readonly', Map: 'readonly', Set: 'readonly', Promise: 'readonly' },
    },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none' }], 'no-dupe-keys': 'error', 'no-unreachable': 'warn', 'no-const-assign': 'error', 'no-redeclare': 'error' },
  },
];
