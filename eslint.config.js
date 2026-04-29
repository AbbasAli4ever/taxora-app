const js            = require('@eslint/js');
const tsPlugin      = require('@typescript-eslint/eslint-plugin');
const tsParser      = require('@typescript-eslint/parser');
const reactPlugin   = require('eslint-plugin-react');
const reactHooks    = require('eslint-plugin-react-hooks');
const reactNative   = require('eslint-plugin-react-native');
const prettier      = require('eslint-plugin-prettier');
const prettierConfig= require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'build/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType:  'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react:                reactPlugin,
      'react-hooks':        reactHooks,
      'react-native':       reactNative,
      prettier,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier':              'error',
      'react/react-in-jsx-scope':       'off',
      'react/prop-types':               'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-native/no-unused-styles':  'warn',
      'react-native/no-inline-styles':  'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
];
