// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const siteHeader = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/layout/SiteHeader.tsx'),
  'utf8',
);

describe('product navigation display labels', () => {
  it('shows AegistonTeam 超级团队 for the AegisTeam product route without changing its href', () => {
    expect(siteHeader).toContain("'/products/aragonteam': 'AegistonTeam 超级团队'");
    expect(siteHeader).toContain("'/products/inkclaw': 'AegisClaw'");
    expect(siteHeader).toContain("'/products/legallens': 'AegisLens 合约智审'");
  });
});
