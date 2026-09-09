// @vitest-environment node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_DIR = fileURLToPath(new URL('.', import.meta.url));
const FRONTEND_DIR = path.resolve(TEST_DIR, '../..');
const deploymentPage = readFileSync(
  path.join(FRONTEND_DIR, 'src/app/products/deployment/page.tsx'),
  'utf8',
);
const pageHero = readFileSync(
  path.join(FRONTEND_DIR, 'src/components/sections/PageHero.tsx'),
  'utf8',
);

const deliveryImages = [
  '/media/deployment/private-server-4x3.png',
  '/media/deployment/appliance-4x3.png',
  '/media/deployment/private-cloud-4x3.png',
];

describe('deployment delivery layout', () => {
  it('removes the readiness intro and readiness cards', () => {
    expect(deploymentPage).not.toContain('data.readiness');
    expect(deploymentPage).not.toContain('READINESS');
    expect(deploymentPage).not.toContain('技术前提');
    expect(deploymentPage).not.toContain('已经具备');
    expect(deploymentPage).not.toContain('「私有化」已从技术妥协，变成可行的产品形态。');
  });

  it('uses the three page-specific 4:3 delivery images', () => {
    for (const image of deliveryImages) {
      expect(deploymentPage).toContain(image);
      expect(existsSync(path.join(FRONTEND_DIR, 'public', image))).toBe(true);
    }
  });

  it('passes page-specific artwork through next/image instead of incomplete media objects', () => {
    expect(deploymentPage).toContain("import Image from 'next/image';");
    expect(deploymentPage).toContain('const deliveryMedia = DELIVERY_MEDIA[index];');
    expect(deploymentPage).toContain('src={deliveryMedia}');
    expect(deploymentPage).not.toContain("url: '/media/deployment/");
  });

  it('crops the deployment hero so the source image right edge stays outside the viewport', () => {
    expect(pageHero).toContain('mediaStyle?: CSSProperties;');
    expect(pageHero).toContain('style={mediaStyle}');
    expect(deploymentPage).toContain('mediaStyle={DEPLOYMENT_HERO_MEDIA_STYLE}');
    expect(deploymentPage).toContain("objectPosition: 'left center'");
    expect(deploymentPage).toContain("transform: 'scale(1.2)'");
    expect(deploymentPage).toContain("transformOrigin: 'left center'");
  });
});
