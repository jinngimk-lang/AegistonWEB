// @vitest-environment node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src');
const detailPage = readFileSync(path.join(SRC_DIR, 'app/products/[slug]/page.tsx'), 'utf8');
const cardPath = path.join(SRC_DIR, 'components/content/DeliveryFormsCard.tsx');
const cardStylesPath = path.join(SRC_DIR, 'components/content/DeliveryFormsCard.module.css');

describe('AegisTeam delivery forms card', () => {
  it('uses a dedicated comparison card only for the AegisTeam detail page', () => {
    expect(detailPage).toContain("slug === 'aragonteam' ? getDeployment() : Promise.resolve(null)");
    expect(detailPage).toContain("slug === 'aragonteam' && deployment");
    expect(detailPage).toContain('<DeliveryFormsCard forms={deployment.forms} />');
  });

  it('renders deployment mode, concrete functions, and use case as one compact table card', () => {
    expect(existsSync(cardPath)).toBe(true);
    expect(existsSync(cardStylesPath)).toBe(true);

    if (!existsSync(cardPath)) return;
    const card = readFileSync(cardPath, 'utf8');
    expect(card).toContain('部署方式');
    expect(card).toContain('具体功能');
    expect(card).toContain('使用场景');
    expect(card).toContain('便携式一体机');
    expect(card).toContain('私有化服务器部署');
    expect(card).toContain('云部署服务');
    expect(card).toContain('✓');
  });
});
