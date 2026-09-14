// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src');
const detailPage = readFileSync(path.join(SRC_DIR, 'app/products/[slug]/page.tsx'), 'utf8');

describe('AegistonLens detail display labels', () => {
  it('uses AegistonLens throughout the legallens detail view without changing its route slug', () => {
    expect(detailPage).toContain("legallens: 'AegistonLens'");
    expect(detailPage).toContain(".replaceAll('LegalLens 合约智审', 'AegistonLens')");
    expect(detailPage).toContain(".replaceAll('LegalLens', 'AegistonLens')");
    expect(detailPage).toContain('eyebrow={product.tierLabel}');
    expect(detailPage).toContain('const displayLabel = displayName;');
    expect(detailPage).toContain('crumbsFromPath(ROUTES.productDetail(slug), displayLabel)');
    expect(detailPage).toContain("title={slug === 'legallens' ? displayName : `${displayName} ${product.nameCn}`}");
    expect(detailPage).toContain('vlabelPrefix={displayLabel.toUpperCase()}');
    expect(detailPage).toContain("if (slug === 'legallens') productStructuredData.name = displayName;");
    expect(detailPage).toContain('ROUTES.productDetail(slug)');
  });
});
