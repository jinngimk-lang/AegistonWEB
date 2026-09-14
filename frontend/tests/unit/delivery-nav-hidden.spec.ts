// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const header = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/layout/SiteHeader.tsx'),
  'utf8',
);
const footer = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/layout/SiteFooter.tsx'),
  'utf8',
);

describe('delivery navigation visibility', () => {
  it('hides the deployment entry from the shared header navigation', () => {
    expect(header).toContain("const HIDDEN_PRODUCT_HEADER_HREFS = new Set(['/products/deployment']);");
    expect(header).toContain('!HIDDEN_PRODUCT_HEADER_HREFS.has(item.href)');
  });

  it('hides the deployment entry from the shared footer navigation', () => {
    expect(footer).toContain("'/products/deployment'");
    expect(footer).toContain('!HIDDEN_FOOTER_HREFS.has(item.href)');
  });
});
