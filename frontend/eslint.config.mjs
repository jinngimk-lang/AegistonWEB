import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'src/types/api.d.ts', 'src/content/snapshot/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    /**
     * `/search` 的查询串是全站**唯一**的用户输入回显点，而 v2 的 CSP 选了
     * `script-src 'self' 'unsafe-inline'` —— 那个取舍的前提之一就是「本站没有
     * 用户输入回显」。v3 §4.2.7 的 S1/S2 必须由静态检查守住，不能只是口头约定。
     *
     * ⚠️ 这条规则**只能局部开**：全仓有 10 处 JSON-LD 用
     * `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`，
     * 全局打开会把它们全部拦掉（S4）。
     */
    files: ['src/components/search/**/*.tsx', 'src/app/search/**/*.tsx'],
    rules: {
      'react/no-danger': 'error',
    },
  },
];
