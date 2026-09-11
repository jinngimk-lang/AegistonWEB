// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const leadForm = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/forms/LeadForm.tsx'),
  'utf8',
);

describe('contact product display labels', () => {
  it('uses Aegis product names while preserving existing submission values', () => {
    expect(leadForm).toContain("{ value: 'aragonteam', label: 'AegisTeam · 组织级' }");
    expect(leadForm).toContain("{ value: 'inkclaw', label: 'AegisClaw · 通用级' }");
    expect(leadForm).toContain("{ value: 'legallens', label: 'AegisLens 合约智审 · 行业级' }");

    expect(leadForm).not.toContain("label: 'AragonTeam · 组织级'");
    expect(leadForm).not.toContain("label: 'InkClaw · 通用级'");
    expect(leadForm).not.toContain("label: 'LegalLens 合约智审 · 行业级'");
  });
});
