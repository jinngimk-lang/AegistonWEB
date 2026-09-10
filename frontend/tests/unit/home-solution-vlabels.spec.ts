// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_DIR = fileURLToPath(new URL('.', import.meta.url));
const FRONTEND_DIR = path.resolve(TEST_DIR, '../..');
const homePage = readFileSync(path.join(FRONTEND_DIR, 'src/app/page.tsx'), 'utf8');

describe('homepage solution visual labels', () => {
  it('uses Aegis product names in the three image labels', () => {
    expect(homePage).toContain("vlabel: 'AEGISTEAM / WORKSTATION'");
    expect(homePage).toContain("vlabel: 'AEGISCLAW / SECURE AGENT'");
    expect(homePage).toContain("vlabel: 'AEGISLENS / CONTRACT REVIEW'");
  });
});
