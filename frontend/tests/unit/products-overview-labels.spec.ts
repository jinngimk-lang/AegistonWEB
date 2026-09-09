// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src');
const productsPage = readFileSync(path.join(SRC_DIR, 'app/products/page.tsx'), 'utf8');

describe('products overview Aegis display labels', () => {
  it('renames the three visible product brands without changing their routes or content source', () => {
    expect(productsPage).toContain("aragonteam: 'AegisTeam'");
    expect(productsPage).toContain("inkclaw: 'AegisClaw'");
    expect(productsPage).toContain("legallens: 'AegisLens'");
    expect(productsPage).toContain('<h2>{productDisplayName(product.slug, product.nameEn)}</h2>');
    expect(productsPage).toContain('productDisplayName(product.slug, product.nameEn).toUpperCase()');
    expect(productsPage).toContain('name: productDisplayName(product.slug, product.nameEn)');
    expect(productsPage).toContain('href={product.href}');
  });
});
