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

describe('product delivery mosaic placement', () => {
  it('renders DeliveryFormsMosaic for AegisTeam, AegisClaw and AegisLens after capabilities', () => {
    expect(productPage).toContain("import { DeliveryFormsMosaic } from '@/components/content/DeliveryFormsMosaic';");
    expect(productPage).toContain(
      "const showsDeliveryMosaic = slug === 'aragonteam' || slug === 'inkclaw' || slug === 'legallens';",
    );
    expect(productPage).toContain('showsDeliveryMosaic ? getDeployment() : Promise.resolve(null)');
    expect(productPage).toContain('showsDeliveryMosaic && deployment ? (');
    expect(productPage).toContain('<DeliveryFormsMosaic forms={deployment.forms} />');

    const capabilities = productPage.indexOf('主要功能');
    const mosaic = productPage.indexOf('<DeliveryFormsMosaic forms={deployment.forms} />');
    const architecture = productPage.indexOf('系统总体架构（仅合约智审');
    const tour = productPage.indexOf('界面导览 —— 真实软件截图');

    expect(capabilities).toBeGreaterThan(-1);
    expect(mosaic).toBeGreaterThan(capabilities);
    expect(architecture).toBeGreaterThan(mosaic);
    expect(tour).toBeGreaterThan(mosaic);
  });
});
