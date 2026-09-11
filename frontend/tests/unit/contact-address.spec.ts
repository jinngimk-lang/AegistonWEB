// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const sourceSite = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'backend/app/content/site.json'), 'utf8'),
) as { settings: { contact: { address?: string | null } } };
const snapshotSettings = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'frontend/src/content/snapshot/site-settings.json'), 'utf8'),
) as { contact: { address?: string | null } };

const COMPANY_ADDRESS = '陕西省西安市高新区丈八一路3号汇智中心1106';

describe('contact company address', () => {
  it('keeps the full company address identical in source data and standalone fallback', () => {
    expect(sourceSite.settings.contact.address).toBe(COMPANY_ADDRESS);
    expect(snapshotSettings.contact.address).toBe(COMPANY_ADDRESS);
  });
});
