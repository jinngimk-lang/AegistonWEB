// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const homePage = readFileSync(path.join(ROOT_DIR, 'frontend/src/app/page.tsx'), 'utf8');
const sectionsCss = readFileSync(path.join(ROOT_DIR, 'frontend/src/styles/sections.css'), 'utf8');

const HERO_SUBTITLE =
  '西安智瞳安宇科技有限公司公司定位于「AI+」企业智能化赋能与安全保障专家，以组织级、通用级、行业级三层产品构成企业智能底座，为客户提供AI人机协同超级团队平台、安全通用智能体与行业垂直智能体的完整能力。';

describe('homepage hero company copy', () => {
  it('uses the approved company-prefixed hero subtitle without changing the remaining hero data', () => {
    expect(homePage).toContain(HERO_SUBTITLE);
    expect(homePage).toContain('const homepageHero = {');
    expect(homePage).toContain('...home.hero,');
    expect(homePage).toContain('<Hero hero={homepageHero} media={media.get(home.hero.media)} />');
  });

  it('keeps the hero subtitle on a wider text measure with a two-character first-line indent', () => {
    expect(sectionsCss).toMatch(/\.hero-sub\s*\{[^}]*text-indent:\s*2em[^}]*max-width:\s*600px[^}]*\}/s);
  });
});
