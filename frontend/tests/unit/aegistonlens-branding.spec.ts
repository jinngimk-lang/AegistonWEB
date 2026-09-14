// @vitest-environment node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const OLD_BRAND = ['Aegis', 'Lens'].join('');
const OLD_BRAND_UPPER = OLD_BRAND.toUpperCase();
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css']);

function collectTextFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectTextFiles(fullPath));
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(entry))) files.push(fullPath);
  }
  return files;
}

describe('AegistonLens branding', () => {
  it('does not leave the former AegisLens spelling in site source or content files', () => {
    const roots = [
      path.join(ROOT_DIR, 'frontend/src'),
      path.join(ROOT_DIR, 'backend/app/content'),
    ];
    const offenders = roots
      .flatMap(collectTextFiles)
      .filter((file) => {
        const content = readFileSync(file, 'utf8');
        return content.includes(OLD_BRAND) || content.includes(OLD_BRAND_UPPER);
      })
      .map((file) => path.relative(ROOT_DIR, file));

    expect(offenders).toEqual([]);
  });
});
