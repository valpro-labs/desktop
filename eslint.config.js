import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const airbnbStyleRules = {
  '@stylistic/jsx-quotes': ['error', 'prefer-double'],
  '@stylistic/quote-props': ['error', 'as-needed'],
  '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
  '@stylistic/semi': ['error', 'always']
};

const importOrderRules = {
  'simple-import-sort/imports': [
    'error',
    {
      groups: [
        ['^\\u0000'],
        ['^react$', '^react-dom$', '^react-native$', '^@?\\w'],
        ['^@/[^/]+/components/'],
        ['^@/[^/]+/hooks/'],
        ['^@/[^/]+/lib/'],
        ['^@/'],
        ['^@assets/'],
        ['^\\.']
      ]
    }
  ],
  'simple-import-sort/exports': 'error',
  '@stylistic/padding-line-between-statements': [
    'error',
    { blankLine: 'always', prev: 'import', next: '*' },
    { blankLine: 'any', prev: 'import', next: 'import' }
  ]
};

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'src/desktop/uniwind-types.d.ts']
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    plugins: {
      '@stylistic': stylistic,
      'simple-import-sort': simpleImportSort
    },
    rules: {
      ...airbnbStyleRules,
      ...importOrderRules
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly',
        overwolf: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      sourceType: 'module'
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./*', '../*'],
              message: 'Use @/ for src imports or @assets/ for assets instead of relative paths.'
            }
          ]
        }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          fixStyle: 'inline-type-imports'
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['src/desktop/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  }
);
