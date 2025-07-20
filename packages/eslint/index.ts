import eslint from '@eslint/js';
import globals from 'globals';
// @ts-expect-error no-types
import html from 'eslint-plugin-html';
import { configs as tslintConfigs, InfiniteDepthConfigWithExtends } from 'typescript-eslint';
import { flatConfigs } from 'eslint-plugin-import';
import prettierRecommendedConfig from 'eslint-plugin-prettier/recommended';

export function getConfig(
    htmlConfig = false,
    tsConfig = './tsconfig.json',
): InfiniteDepthConfigWithExtends[] {
    return [
        htmlConfig
            ? {
                  files: ['**/*.html'],
                  plugins: {
                      html,
                  },
                  languageOptions: {
                      parserOptions: {
                          ecmaVersion: 'latest',
                          sourceType: 'script',
                      },
                      globals: {
                          ...globals.browser,
                      },
                  },
                  rules: {
                      indent: ['error', 4],
                      'linebreak-style': ['error', 'unix'],
                      quotes: ['error', 'single'],
                      semi: ['error', 'always'],
                  },
              }
            : [],
        {
            files: ['**/*.js', '**/*.mjs', '**/*.ts', '**/*.tsx'],
            extends: [eslint.configs.recommended, prettierRecommendedConfig],
            languageOptions: {
                parserOptions: {
                    ecmaVersion: 'latest',
                    sourceType: 'module',
                },
            },
            rules: {
                'prettier/prettier': [
                    'error',
                    {
                        tabWidth: 4,
                        printWidth: 110,
                        singleQuote: true,
                    },
                ],
            },
        },
        {
            files: ['**/*.ts', '**/*.tsx'],
            extends: [
                ...tslintConfigs.recommended,
                ...tslintConfigs.stylistic,
                flatConfigs.recommended,
                flatConfigs.typescript,
            ],
            rules: {
                'import/order': ['error'],
                '@typescript-eslint/no-empty-function': ['off'],
                '@typescript-eslint/no-unused-expressions': ['off'],
                '@typescript-eslint/no-unused-vars': ['warn'],
            },
            settings: {
                'import/resolver': {
                    typescript: {
                        alwaysTryTypes: true,
                        project: tsConfig,
                    },
                },
            },
            languageOptions: {
                parserOptions: {
                    projectService: true,
                },
            },
        },
    ];
}
