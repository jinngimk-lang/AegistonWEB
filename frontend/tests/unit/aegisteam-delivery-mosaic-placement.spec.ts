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
const mosaic = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/content/DeliveryFormsMosaic.tsx'),
  'utf8',
);

describe('product delivery mosaic placement', () => {
  it('renders DeliveryFormsMosaic for AegisTeam, AegisClaw and AegisLens after capabilities', () => {
    expect(productPage).toContain("import { DeliveryFormsMosaic } from '@/components/content/DeliveryFormsMosaic';");
    expect(productPage).toContain(
      "const showsDeliveryMosaic = slug === 'aragonteam' || slug === 'inkclaw' || slug === 'legallens';",
    );
    expect(productPage).toContain('showsDeliveryMosaic ? getDeployment() : Promise.resolve(null)');
    expect(productPage).toContain('showsDeliveryMosaic && deployment ? (');
    expect(productPage).toContain(
      "<DeliveryFormsMosaic forms={deployment.forms} stretchSideImages={slug === 'aragonteam'} />",
    );

    const capabilities = productPage.indexOf('主要功能');
    const mosaicPlacement = productPage.indexOf('<DeliveryFormsMosaic');
    const architecture = productPage.indexOf('系统总体架构（仅合约智审');
    const tour = productPage.indexOf('界面导览 —— 真实软件截图');

    expect(capabilities).toBeGreaterThan(-1);
    expect(mosaicPlacement).toBeGreaterThan(capabilities);
    expect(architecture).toBeGreaterThan(mosaicPlacement);
    expect(tour).toBeGreaterThan(mosaicPlacement);
  });

  it('stretches only the two right-side images on AegistonTeam while keeping the reusable default cropped', () => {
    expect(mosaic).toContain('stretchSideImages?: boolean;');
    expect(mosaic).toContain('stretchSideImages = false');
    expect(mosaic).toContain("objectFit: stretchSideImages && slot > 0 ? 'fill' : 'cover'");
    expect(productPage).toContain("stretchSideImages={slug === 'aragonteam'}");
  });

  it('does not render the legacy bottom delivery section on product detail pages', () => {
    expect(productPage).not.toContain('aria-labelledby="delivery-title"');
    expect(productPage).not.toContain('id="delivery-title"');
    expect(productPage).not.toContain('product.delivery.map');
    expect(productPage).not.toContain('详见 <a href={ROUTES.productsDeployment}>交付形态</a> 页');
  });
});
