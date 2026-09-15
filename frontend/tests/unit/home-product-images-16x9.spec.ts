// @vitest-environment node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const domainGrid = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/sections/DomainGrid.tsx'),
  'utf8',
);

describe('homepage 16:9 product images', () => {
  it('uses the approved 16:9 Aegiston assets in the three homepage domain cards', () => {
    const assets = [
      '/media/home/aegistonteam-16x9.png',
      '/media/home/aegistonclaw-16x9.png',
      '/media/home/aegistonlens-16x9.png',
    ];

    for (const asset of assets) {
      expect(domainGrid).toContain(asset);
      expect(existsSync(path.join(ROOT_DIR, 'frontend/public', asset.slice(1)))).toBe(true);
    }

    expect(domainGrid).toContain("domain.id === 'organizational-intelligence'");
    expect(domainGrid).toContain("domain.id === 'general-agent'");
    expect(domainGrid).toContain("domain.id === 'legal-intelligence'");
    expect(domainGrid).toContain("PRIVATE_DEPLOYMENT_HOME_CARD_SRC");
  });
});
