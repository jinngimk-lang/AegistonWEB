// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const APP_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/app');
const aboutPage = readFileSync(path.join(APP_DIR, 'about/page.tsx'), 'utf8');

describe('about page display copy', () => {
  it('uses the approved company positioning and fact copy without changing the content source', () => {
    expect(aboutPage).toContain(
      "const ABOUT_INTRO = '西安智瞳安宇科技有限公司定位于「AI+」企业智能化赋能与安全保障专家，以组织级、通用级、行业级三层产品构成企业智能底座，为客户提供AI人机协同超级团队平台、安全通用智能体与行业垂直智能体的完整能力。';",
    );
    expect(aboutPage).toContain(
      "'企业性质': '西安智瞳安宇科技有限公司是一家由高校教授团队为推进科技成果转化而创立的高科技企业。'",
    );
    expect(aboutPage).toContain(
      "'科研依托': '公司依托西安电子科技大学雄厚的科研实力（网络空间安全学科连续四年排名全国第一，人工智能排名全国前三）'",
    );
    expect(aboutPage).toContain('{ABOUT_INTRO}');
    expect(aboutPage).toContain('ABOUT_FACT_OVERRIDES[fact.label] ?? fact.body');
  });

  it('matches the four homepage metrics in the about-page metric band', () => {
    for (const value of ["value: '20+'", "value: '30+'", "value: '全国顶尖'"]) {
      expect(aboutPage).toContain(value);
    }
    expect(aboutPage).toContain("unit: '名'");
    expect(aboutPage).toContain("unit: '项'");
    expect(aboutPage).toContain("unit: '篇'");
    expect(aboutPage).toContain("label: '博士 · 硕士研发队伍'");
    expect(aboutPage).toContain("label: '自主知识产权核心技术'");
    expect(aboutPage).toContain("label: '公司依托西安电子科技大学雄厚的科研实力'");
    expect(aboutPage).toContain("note: '网络空间安全学科连续四年排名全国第一 人工智能排名全国前三'");
    expect(aboutPage).toContain("label: '国际顶会论文'");
    expect(aboutPage).toContain("note: '人工智能/网络安全/软件工程/国际顶会'");
    expect(aboutPage).toContain('<MetricBand metrics={ABOUT_METRICS} />');
  });

  it('keeps only the research team card in the more-about section and removes the ranking disclaimer', () => {
    expect(aboutPage).toContain('href: ROUTES.aboutTeam');
    expect(aboutPage).not.toContain('href: ROUTES.aboutPositioning');
    expect(aboutPage).not.toContain('href: ROUTES.aboutStrength');
    expect(aboutPage).not.toContain('页面中的「网络空间安全学科全国顶尖」');
    expect(aboutPage).not.toContain('Callout tone="neutral"');
  });

  it('pairs the widened research team card with the AEGISTON office image', () => {
    expect(aboutPage).toContain('className="about-more-layout"');
    expect(aboutPage).toContain('className="about-more-card card"');
    expect(aboutPage).toContain('className="about-more-visual"');
    expect(aboutPage).toContain('src="/media/about/aegiston.png"');
    expect(aboutPage).toContain('alt="智瞳安宇研发团队办公场景"');

    const cardIndex = aboutPage.indexOf('className="about-more-card card"');
    const imageIndex = aboutPage.indexOf('src="/media/about/aegiston.png"');
    expect(cardIndex).toBeGreaterThan(-1);
    expect(imageIndex).toBeGreaterThan(cardIndex);
  });
});
