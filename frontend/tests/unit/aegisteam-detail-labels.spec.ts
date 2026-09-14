// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src');
const detailPage = readFileSync(path.join(SRC_DIR, 'app/products/[slug]/page.tsx'), 'utf8');

describe('AegistonTeam detail display labels', () => {
  it('uses AegistonTeam throughout the aragonteam detail view without changing its route slug', () => {
    expect(detailPage).toContain("aragonteam: 'AegistonTeam'");
    expect(detailPage).toContain('eyebrow={product.tierLabel}');
    expect(detailPage).toContain('crumbsFromPath(ROUTES.productDetail(slug), displayLabel)');
    expect(detailPage).toContain('title={`${displayName} ${product.nameCn}`}');
    expect(detailPage).toContain('vlabelPrefix={displayLabel.toUpperCase()}');
    expect(detailPage).toContain("value.replaceAll('AragonTeam', 'AegistonTeam')");
    expect(detailPage).toContain('productJsonLd(displayProduct)');
    expect(detailPage).toContain('ROUTES.productDetail(slug)');
  });
});
