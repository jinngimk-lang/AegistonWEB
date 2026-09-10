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
});
