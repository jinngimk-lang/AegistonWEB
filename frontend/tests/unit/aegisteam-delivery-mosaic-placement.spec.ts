// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const productPage = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/app/products/[slug]/page.tsx'),
  'utf8',
);

describe('product delivery presentation placement', () => {
  it('uses the embedded comparison SVG for AegistonTeam, AegistonClaw and AegistonLens', () => {
    expect(productPage).not.toContain("import { DeliveryFormsMosaic } from '@/components/content/DeliveryFormsMosaic';");
    expect(productPage).not.toContain('getDeployment');
    expect(productPage).toContain(
      "const showsDeliveryComparison = slug === 'aragonteam' || slug === 'inkclaw' || slug === 'legallens';",
    );
    expect(productPage).toContain('showsDeliveryComparison ? (');
    expect(productPage).toContain('/media/deployment/aegiston-delivery-forms-comparison-embed.svg');
    expect(productPage).toContain('width={1400}');
    expect(productPage).toContain('height={1050}');
    expect(productPage).toContain("style={{ width: '100%', height: 'auto', display: 'block' }}");
    expect(productPage).not.toContain('<DeliveryFormsMosaic');

    const capabilities = productPage.indexOf('主要功能');
    const comparisonSvg = productPage.indexOf('/media/deployment/aegiston-delivery-forms-comparison-embed.svg');
    const architecture = productPage.indexOf('系统总体架构（仅合约智审');
    const tour = productPage.indexOf('界面导览 —— 真实软件截图');

    expect(capabilities).toBeGreaterThan(-1);
    expect(comparisonSvg).toBeGreaterThan(capabilities);
    expect(architecture).toBeGreaterThan(comparisonSvg);
    expect(tour).toBeGreaterThan(comparisonSvg);
  });

  it('does not render the legacy bottom delivery section on product detail pages', () => {
    expect(productPage).not.toContain('aria-labelledby="delivery-title"');
    expect(productPage).not.toContain('id="delivery-title"');
    expect(productPage).not.toContain('product.delivery.map');
    expect(productPage).not.toContain('详见 <a href={ROUTES.productsDeployment}>交付形态</a> 页');
  });
});
