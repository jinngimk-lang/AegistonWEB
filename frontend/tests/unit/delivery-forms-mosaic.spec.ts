// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const deploymentPage = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/app/products/deployment/page.tsx'),
  'utf8',
);
const mosaic = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/content/DeliveryFormsMosaic.tsx'),
  'utf8',
);
const styles = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/components/content/DeliveryFormsMosaic.module.css'),
  'utf8',
);

describe('delivery forms mosaic', () => {
  it('reuses the three existing forms and media in a left-large/right-two layout', () => {
    expect(deploymentPage).toContain('<DeliveryFormsMosaic forms={data.forms} />');
    expect(deploymentPage).not.toContain('data.forms.map');

    expect(mosaic).toContain('const DISPLAY_ORDER = [1, 0, 2] as const;');
    expect(mosaic).toContain('/media/deployment/private-server-4x3.png');
    expect(mosaic).toContain('/media/deployment/appliance-4x3.png');
    expect(mosaic).toContain('/media/deployment/private-cloud-4x3.png');
    expect(mosaic).toContain("index === 2 ? '云部署服务' : form.name");
    expect(mosaic).toContain('CLOUD_DEPLOYMENT_POINT');

    expect(styles).toContain('grid-template-areas:');
    expect(styles).toContain('"feature primary"');
    expect(styles).toContain('"feature secondary"');
    expect(styles).toContain('@media (max-width: 900px)');
    expect(styles).toContain('grid-template-areas: none;');
  });

  it('carries its DELIVERY FORMS heading with the reusable component', () => {
    expect(mosaic).toContain('<div className="section-label">DELIVERY FORMS</div>');
    expect(mosaic).toContain('三种交付形态');
    expect(mosaic).toContain('id="delivery-forms-title"');
    expect(deploymentPage).not.toContain('<div className="section-label">DELIVERY FORMS</div>');
    expect(deploymentPage).not.toContain('id="forms-title"');
  });
});
