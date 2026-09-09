// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src');

function read(relativePath: string): string {
  return readFileSync(path.join(SRC_DIR, relativePath), 'utf8');
}

const layout = read('app/layout.tsx');
const header = read('components/layout/SiteHeader.tsx');
const hero = read('components/sections/Hero.tsx');

describe('header language placement and home hero cleanup', () => {
  it('does not render the legacy utility bar globally', () => {
    expect(layout).not.toContain("components/layout/UtilityBar");
    expect(layout).not.toContain('<UtilityBar');
  });

  it('places the language status under search and before the contact action', () => {
    const actions = header.indexOf('<div className="nav-actions">');
    const stack = header.indexOf('className="nav-language-stack"', actions);
    const search = header.indexOf('<SearchTrigger', stack);
    const language = header.indexOf('className="nav-language"', search);
    const contact = header.indexOf("className={cn('nav-contact')}", language);

    expect(actions).toBeGreaterThan(-1);
    expect(stack).toBeGreaterThan(actions);
    expect(search).toBeGreaterThan(stack);
    expect(language).toBeGreaterThan(search);
    expect(contact).toBeGreaterThan(language);
    expect(header).toContain('aria-current="true"');
    expect(header).toContain('aria-disabled="true"');
    expect(header).toContain('title="英文站建设中"');
  });

  it('removes the redundant home hero eyebrow and preserves the hero title wiring', () => {
    expect(hero).not.toContain('className="hero-eyebrow"');
    expect(hero).not.toContain('{hero.eyebrow}');
    expect(hero).toContain('<h1 id="hero-title">');
    expect(hero).toContain('{hero.titleLead}');
    expect(hero).toContain('{hero.subtitle}');
  });
});
