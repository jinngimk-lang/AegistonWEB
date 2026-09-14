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
  it('uses the embedded comparison SVG only for AegistonTeam and keeps the mosaic for AegistonClaw/AegistonLens', () => {
    expect(productPage).toContain("import { DeliveryFormsMosaic } from '@/components/content/DeliveryFormsMosaic';");
    expect(productPage).toContain(
      "const showsDeliveryMosaic = slug === 'inkclaw' || slug === 'legallens';",
    );
    expect(productPage).toContain('showsDeliveryMosaic ? getDeployment() : Promise.resolve(null)');
    expect(productPage).toContain("slug === 'aragonteam' ? (");
    expect(productPage).toContain('/media/deployment/aegiston-delivery-forms-comparison-embed.svg');
    expect(productPage).toContain('width={1400}');
    expect(productPage).toContain('height={1050}');
    expect(productPage).toContain("style={{ width: '100%', height: 'auto', display: 'block' }}");
    expect(productPage).toContain('showsDeliveryMosaic && deployment ? (');
    expect(productPage).toContain('<DeliveryFormsMosaic forms={deployment.forms} />');
    expect(productPage).not.toContain("stretchSideImages={slug === 'aragonteam'}");

    const capabilities = productPage.indexOf('主要功能');
    const teamSvg = productPage.indexOf('/media/deployment/aegiston-delivery-forms-comparison-embed.svg');
    const mosaicPlacement = productPage.indexOf('<DeliveryFormsMosaic forms={deployment.forms} />');
    const architecture = productPage.indexOf('系统总体架构（仅合约智审');
    const tour = productPage.indexOf('界面导览 —— 真实软件截图');

    expect(capabilities).toBeGreaterThan(-1);
    expect(teamSvg).toBeGreaterThan(capabilities);
    expect(mosaicPlacement).toBeGreaterThan(capabilities);
    expect(architecture).toBeGreaterThan(teamSvg);
    expect(architecture).toBeGreaterThan(mosaicPlacement);
    expect(tour).toBeGreaterThan(teamSvg);
    expect(tour).toBeGreaterThan(mosaicPlacement);
  });

  it('does not render the legacy bottom delivery section on product detail pages', () => {
    expect(productPage).not.toContain('aria-labelledby="delivery-title"');
    expect(productPage).not.toContain('id="delivery-title"');
    expect(productPage).not.toContain('product.delivery.map');
    expect(productPage).not.toContain('详见 <a href={ROUTES.productsDeployment}>交付形态</a> 页');
  });
});
