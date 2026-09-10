// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const APP_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/app');
const solutionsPage = readFileSync(path.join(APP_DIR, 'solutions/page.tsx'), 'utf8');

describe('solutions overview hero copy', () => {
  it('uses the future-proof partner and enterprise landing copy in both hero and metadata', () => {
    expect(solutionsPage).toContain("const SOLUTIONS_HERO_TITLE = '合作伙伴与企业落地';");
    expect(solutionsPage).toContain(
      "const SOLUTIONS_HERO_DESCRIPTION =\n  '我们围绕企业智能化落地，逐步形成可复制的实施路径：以平台、智能体与行业能力为底座，灵活适配不同业务场景与部署环境。项目经验持续沉淀为知识、流程与行业能力，让每一次落地都成为下一次拓展与升级的基础。';",
    );
    expect(solutionsPage).toContain(
      'return pageMetadata({ title: SOLUTIONS_HERO_TITLE, description: SOLUTIONS_HERO_DESCRIPTION, path: ROUTES.solutions });',
    );
    expect(solutionsPage).toContain('title={SOLUTIONS_HERO_TITLE}');
    expect(solutionsPage).toContain('subtitle={SOLUTIONS_HERO_DESCRIPTION}');
  });

  it('uses anonymized partner and future-proof customer case labels', () => {
    expect(solutionsPage).toContain("const SOLUTIONS_PARTNER_NAME = '某通信服务行业大型央企';");
    expect(solutionsPage).toContain("const SOLUTIONS_TELECOM_CUSTOMER = '某通信服务行业大型央企';");
    expect(solutionsPage).toContain('{SOLUTIONS_PARTNER_NAME}');
    expect(solutionsPage).toContain("solution.slug === 'telecom' ? SOLUTIONS_TELECOM_CUSTOMER : solution.customer");
    expect(solutionsPage).toContain('典型客户案例');
    expect(solutionsPage).not.toContain('<span className="em">落地客户</span>');
  });

  it('uses the four approved repository-local industry card images', () => {
    expect(solutionsPage).toContain("telecom: '/media/solutions/telecom-client.png'");
    expect(solutionsPage).toContain("transportation: '/media/solutions/transportation-client.png'");
    expect(solutionsPage).toContain("'legal-services': '/media/solutions/legal-client.png'");
    expect(solutionsPage).toContain("finance: '/media/solutions/finance-client.png'");
    expect(solutionsPage).toContain('src={cardImage}');
  });
});
