import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    ignores: ['lib/**/*'],
  },
  {
    files: ['src/**/*.@(js|mjs|cjs|ts)'],
    rules: {
      'prettier/prettier': 'warn',
    },
  },
];
