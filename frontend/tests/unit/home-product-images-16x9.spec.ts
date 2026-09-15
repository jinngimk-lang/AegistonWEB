// @vitest-environment node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const solutionRows = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/sections/SolutionRows.tsx'),
  'utf8',
);

describe('homepage 16:9 product images', () => {
  it('uses the approved 16:9 Aegiston product assets on the homepage only', () => {
    const assets = [
      '/media/home/aegistonteam-16x9.png',
      '/media/home/aegistonclaw-16x9.png',
      '/media/home/aegistonlens-16x9.png',
    ];

    for (const asset of assets) {
      expect(solutionRows).toContain(asset);
      expect(existsSync(path.join(ROOT_DIR, 'frontend/public', asset.slice(1)))).toBe(true);
    }

    expect(solutionRows).not.toContain('/media/product-originals/aragonteam-original.png');
    expect(solutionRows).not.toContain('/media/product-originals/inkclaw-original.png');
    expect(solutionRows).not.toContain('/media/product-originals/legallens-original.png');
  });
});
