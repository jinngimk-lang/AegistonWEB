// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const APP_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/app');
const solutionDetailPage = readFileSync(path.join(APP_DIR, 'solutions/[slug]/page.tsx'), 'utf8');

describe('solution detail display overrides', () => {
  it('anonymizes the telecom customer in metadata and the hero', () => {
    expect(solutionDetailPage).toContain("const TELECOM_CUSTOMER_NAME = '某通信服务行业大型央企';");
    expect(solutionDetailPage).toContain("slug === 'telecom' ? TELECOM_CUSTOMER_NAME : data.customer");
  });

  it('shows the telecom architecture image between metrics and landing details', () => {
    expect(solutionDetailPage).toContain("src=\"/media/solutions/telecom-architecture.png\"");
    expect(solutionDetailPage).toContain("slug === 'telecom'");

    const imageIndex = solutionDetailPage.indexOf('/media/solutions/telecom-architecture.png');
    const detailIndex = solutionDetailPage.indexOf('HOW IT LANDS');
    expect(imageIndex).toBeGreaterThan(-1);
    expect(detailIndex).toBeGreaterThan(imageIndex);
  });

  it('shows the transportation architecture image between metrics and landing details', () => {
    expect(solutionDetailPage).toContain("src=\"/media/solutions/transportation-architecture.png\"");
    expect(solutionDetailPage).toContain("slug === 'transportation'");

    const imageIndex = solutionDetailPage.indexOf('/media/solutions/transportation-architecture.png');
    const detailIndex = solutionDetailPage.indexOf('HOW IT LANDS');
    expect(imageIndex).toBeGreaterThan(-1);
    expect(detailIndex).toBeGreaterThan(imageIndex);
  });

  it('shows the legal-services architecture image between metrics and landing details', () => {
    expect(solutionDetailPage).toContain("src=\"/media/solutions/legal-architecture.png\"");
    expect(solutionDetailPage).toContain("slug === 'legal-services'");

    const imageIndex = solutionDetailPage.indexOf('/media/solutions/legal-architecture.png');
    const detailIndex = solutionDetailPage.indexOf('HOW IT LANDS');
    expect(imageIndex).toBeGreaterThan(-1);
    expect(detailIndex).toBeGreaterThan(imageIndex);
  });

  it('shows the finance architecture image between metrics and landing details', () => {
    expect(solutionDetailPage).toContain("src=\"/media/solutions/finance-architecture.png\"");
    expect(solutionDetailPage).toContain("slug === 'finance'");

    const imageIndex = solutionDetailPage.indexOf('/media/solutions/finance-architecture.png');
    const detailIndex = solutionDetailPage.indexOf('HOW IT LANDS');
    expect(imageIndex).toBeGreaterThan(-1);
    expect(detailIndex).toBeGreaterThan(imageIndex);
  });
});
