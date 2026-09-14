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

describe('AegisTeam and AegisClaw delivery mosaic placement', () => {
  it('renders DeliveryFormsMosaic for AegisTeam and AegisClaw between capabilities and product tour', () => {
    expect(productPage).toContain("import { DeliveryFormsMosaic } from '@/components/content/DeliveryFormsMosaic';");
    expect(productPage).toContain("const showsDeliveryMosaic = slug === 'aragonteam' || slug === 'inkclaw';");
    expect(productPage).toContain('showsDeliveryMosaic ? getDeployment() : Promise.resolve(null)');
    expect(productPage).toContain('showsDeliveryMosaic && deployment ? (');
    expect(productPage).toContain('<DeliveryFormsMosaic forms={deployment.forms} />');

    const capabilities = productPage.indexOf('主要功能');
    const mosaic = productPage.indexOf('<DeliveryFormsMosaic forms={deployment.forms} />');
    const tour = productPage.indexOf('界面导览 —— 真实软件截图');

    expect(capabilities).toBeGreaterThan(-1);
    expect(mosaic).toBeGreaterThan(capabilities);
    expect(tour).toBeGreaterThan(mosaic);
  });
});
