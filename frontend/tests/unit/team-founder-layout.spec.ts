// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const teamPage = readFileSync(
  path.join(ROOT_DIR, 'frontend/src/app/about/team/page.tsx'),
  'utf8',
);
const sourceTeam = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'backend/app/content/about/team.json'), 'utf8'),
) as { leader: { bio: string[]; highlights: string[] } };
const snapshotTeam = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'frontend/src/content/snapshot/about-team.json'), 'utf8'),
) as { leader: { bio: string[]; highlights: string[] } };

const CONSULTANT_LINE = '担任多个国家部委及大型互联网企业的专家顾问';

describe('team founder profile layout', () => {
  it('adds the consultant line after the first founder biography item in source and fallback snapshot', () => {
    expect(sourceTeam.leader.bio[1]).toBe(CONSULTANT_LINE);
    expect(snapshotTeam.leader.bio[1]).toBe(CONSULTANT_LINE);
  });

  it('places the degree on a full-width grid row so both detail lists start on the same row', () => {
    expect(teamPage).toContain("className=\"pillar-row\" style={{ gridColumn: '1 / -1' }}");

    const degreeIndex = teamPage.indexOf('{data.leader.degree ? (');
    const bioIndex = teamPage.indexOf('{data.leader.bio.map((line) => (');
    const highlightsIndex = teamPage.indexOf('{data.leader.highlights.map((line) => (');

    expect(degreeIndex).toBeGreaterThan(-1);
    expect(bioIndex).toBeGreaterThan(degreeIndex);
    expect(highlightsIndex).toBeGreaterThan(bioIndex);
  });
});
