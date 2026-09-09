// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src');
const deploymentPage = readFileSync(
  path.join(SRC_DIR, 'app/products/deployment/page.tsx'),
  'utf8',
);

describe('deployment readiness section', () => {
  it('keeps the four readiness cards but removes the redundant readiness intro', () => {
    expect(deploymentPage).toContain('<FeatureGrid items={data.readiness} cols={4} />');
    expect(deploymentPage).not.toContain('READINESS');
    expect(deploymentPage).not.toContain('技术前提');
    expect(deploymentPage).not.toContain('已经具备');
    expect(deploymentPage).not.toContain('「私有化」已从技术妥协，变成可行的产品形态。');
  });
});
