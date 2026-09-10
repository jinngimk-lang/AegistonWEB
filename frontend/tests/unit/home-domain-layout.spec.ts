// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const STYLES_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/styles');
const responsive = readFileSync(path.join(STYLES_DIR, 'responsive.css'), 'utf8');
const sections = readFileSync(path.join(STYLES_DIR, 'sections.css'), 'utf8');

describe('homepage three-card domain layout', () => {
  it('widens only the three-column homepage grid to a 1200px maximum', () => {
    expect(responsive).toMatch(
      /\.domains:where\(\[data-columns='3'\]\)\s*\{[^}]*max-width:\s*min\(1200px,\s*100%\)/,
    );
  });

  it('uses 230px artwork on the homepage three-card grid while preserving the global default', () => {
    expect(responsive).toMatch(
      /\.domains:where\(\[data-columns='3'\]\)\s+\.domain-photo\s*\{[^}]*height:\s*230px/,
    );
    expect(sections).toMatch(/\.domain-photo\s*\{[^}]*height:\s*168px/);
  });
});
