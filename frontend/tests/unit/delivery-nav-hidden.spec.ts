// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const layout = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/app/layout.tsx'),
  'utf8',
);

describe('delivery navigation visibility', () => {
  it('filters the deployment entry before shared header/footer rendering', () => {
    expect(layout).toContain("const HIDDEN_GLOBAL_NAV_HREFS = new Set(['/products/deployment']);");
    expect(layout).toContain('items: group.items.filter((item) => !HIDDEN_GLOBAL_NAV_HREFS.has(item.href))');
    expect(layout).toContain('items: column.items.filter((item) => !HIDDEN_GLOBAL_NAV_HREFS.has(item.href))');
    expect(layout).toContain('navigation={visibleNavigation}');
  });
});
