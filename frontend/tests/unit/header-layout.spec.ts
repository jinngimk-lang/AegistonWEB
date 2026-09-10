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
const homePage = read('app/page.tsx');
const header = read('components/layout/SiteHeader.tsx');
const footer = read('components/layout/SiteFooter.tsx');
const hero = read('components/sections/Hero.tsx');
const ctaBand = read('components/sections/CtaBand.tsx');
const domainGrid = read('components/sections/DomainGrid.tsx');
const responsive = read('styles/responsive.css');

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

  it('moves about to the final primary-nav slot and nests careers under it', () => {
    expect(header).toContain("group.label === '关于我们'");
    expect(header).toContain("group.label === '加入我们'");
    expect(header).toContain('items: [...about.items.filter');
    expect(header).toContain('main: headerMain.filter');
    expect(header).toContain('{displayNavigation.main.map');
    expect(header).toContain('navigation={displayNavigation}');
  });

  it('hides positioning and research strength from the about header menu on desktop and mobile', () => {
    expect(header).toContain("'/about/positioning'");
    expect(header).toContain("'/about/strength'");
    expect(header).toContain('!HIDDEN_ABOUT_HEADER_HREFS.has(item.href)');
    expect(header).toContain('{displayNavigation.main.map');
    expect(header).toContain('navigation={displayNavigation}');
  });

  it('hides research from the header on every page', () => {
    expect(header).toContain("group.label !== '技术与研究'");
    expect(header).toContain('navigationForHeader(navigation)');
    expect(header).not.toContain("navigationForHeader(navigation, pathname === '/')");
    expect(header).not.toContain('hideResearch');
  });

  it('uses Aegis product display names in the header and footer without changing link wiring', () => {
    for (const label of ['AegisTeam', 'AegisClaw', 'AegisLens 合约智审']) {
      expect(header).toContain(label);
      expect(footer).toContain(label);
    }
    expect(header).toContain('href={item.href}');
    expect(footer).toContain('href={item.href}');
  });

  it('removes the redundant home hero eyebrow and preserves the hero title wiring', () => {
    expect(hero).not.toContain('className="hero-eyebrow"');
    expect(hero).not.toContain('{hero.eyebrow}');
    expect(hero).toContain('<h1 id="hero-title">');
    expect(hero).toContain('{hero.titleLead}');
    expect(hero).toContain('{hero.subtitle}');
  });

  it('keeps private deployment reusable but hides it from the homepage and uses a white CTA surface', () => {
    expect(homePage).not.toContain("components/sections/SustainBlock");
    expect(homePage).not.toContain('<SustainBlock');
    expect(homePage).toContain('<CtaBand cta={homepageCta} surface="white" />');
    expect(ctaBand).toContain("surface?: 'default' | 'white'");
    expect(ctaBand).toContain("background: 'var(--white)'");
  });

  it('hides the private-deployment domain card only on the homepage and centers the remaining three', () => {
    expect(homePage).toContain("domain.id !== 'private-deployment'");
    expect(homePage).toContain('<DomainGrid domains={homepageDomains} media={media} columns={3} />');
    expect(domainGrid).toContain('columns?: 3 | 4');
    expect(domainGrid).toContain('data-columns={columns}');
    expect(responsive).toContain(".domains:where([data-columns='3'])");
    expect(responsive).toContain('max-width: min(1200px, 100%)');
    expect(responsive).toContain(".domains:where([data-columns='3']) .domain-photo");
    expect(responsive).toContain('height: 230px');
    expect(responsive).toContain('margin: 0 auto');
  });
});
