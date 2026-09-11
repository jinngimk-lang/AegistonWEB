// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const APP_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/app');
const teamPage = readFileSync(path.join(APP_DIR, 'about/team/page.tsx'), 'utf8');

describe('about team leader layout', () => {
  it('moves the degree text into the former resume position and removes the red-boxed leader details', () => {
    expect(teamPage).toContain('{data.leader.degree ? (');
    expect(teamPage).toContain('<p>{data.leader.degree}</p>');
    expect(teamPage).not.toContain('<h5>履历</h5>');
    expect(teamPage).not.toContain('<h5>科研与转化</h5>');
    expect(teamPage).not.toContain('<h5>主要社会兼职</h5>');
    expect(teamPage).not.toContain('data.leader.bio.map');
    expect(teamPage).not.toContain('data.leader.highlights.map');
    expect(teamPage).not.toContain('data.leaderRoles.map');
    expect(teamPage).not.toContain('className="pillar-tag">{data.leader.degree}');
  });
});
