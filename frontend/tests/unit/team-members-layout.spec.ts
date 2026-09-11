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
) as { members: Array<{ name: string; degree?: string }> };
const snapshotTeam = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'frontend/src/content/snapshot/about-team.json'), 'utf8'),
) as { members: Array<{ name: string; degree?: string }> };

const TEAM_MEMBERS_INTRO =
  '公司依托西安电子科技大学雄厚的科研实力（网络空间安全学科连续四年排名全国第一，人工智能排名全国前三），拥有一支由20多名博士、硕士组成的一流研发队伍，已形成三十余项自主知识产权的核心技术，是一家专注于人工智能与网络安全领域的产品和解决方案供应商。';

function expectApprovedMembers(members: Array<{ name: string; degree?: string }>) {
  expect(members.map((member) => member.name)).toEqual(['焦瑞', '冯哲轩']);
  expect(members[0]?.degree).toBe('技术总监/CTO');
  expect(members[1]?.degree).toBe('博士');
}

describe('team core members section', () => {
  it('keeps only the two approved member cards and labels Jiao Rui as CTO in source and fallback snapshot', () => {
    expectApprovedMembers(sourceTeam.members);
    expectApprovedMembers(snapshotTeam.members);
  });

  it('shows the approved team capability summary directly below the section title with restrained body styling', () => {
    expect(teamPage).toContain(`const TEAM_MEMBERS_INTRO =\n  '${TEAM_MEMBERS_INTRO}';`);
    expect(teamPage).toContain('{TEAM_MEMBERS_INTRO}');
    expect(teamPage).toContain('className="section-desc"');
    expect(teamPage).toContain('maxWidth: 920');
    expect(teamPage).toContain('fontSize: 14');
    expect(teamPage).toContain('lineHeight: 1.9');

    const titleIndex = teamPage.indexOf('技术团队与核心人员');
    const introIndex = teamPage.indexOf('{TEAM_MEMBERS_INTRO}');
    const cardsIndex = teamPage.indexOf('className="card-grid"');

    expect(titleIndex).toBeGreaterThan(-1);
    expect(introIndex).toBeGreaterThan(titleIndex);
    expect(cardsIndex).toBeGreaterThan(introIndex);
  });
});
