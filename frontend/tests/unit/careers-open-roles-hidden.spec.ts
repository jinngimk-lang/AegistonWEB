// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const careersPage = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/app/careers/page.tsx'),
  'utf8',
);

describe('careers page open roles visibility', () => {
  it('does not render the OPEN ROLES / 在招方向 section', () => {
    expect(careersPage).not.toContain('OPEN ROLES');
    expect(careersPage).not.toContain('在招方向');
    expect(careersPage).not.toContain('data.openings');
  });
});
