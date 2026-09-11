// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const sourceTeam = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'backend/app/content/about/team.json'), 'utf8'),
) as { metrics: Metric[] };
const snapshotTeam = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'frontend/src/content/snapshot/about-team.json'), 'utf8'),
) as { metrics: Metric[] };

type Metric = {
  value: string;
  unit: string | null;
  label: string;
  note: string;
  source: string;
};

const HOME_DISPLAY_METRICS: Metric[] = [
  {
    value: '20+',
    unit: '名',
    label: '博士 · 硕士研发队伍',
    note: '由西安电子科技大学的博士与硕士研究生组成',
    source: 'PPT p.91 / p.93',
  },
  {
    value: '30+',
    unit: '项',
    label: '自主知识产权核心技术',
    note: '公司已形成的自主知识产权核心技术数量',
    source: 'PPT p.93',
  },
  {
    value: '全国顶尖',
    unit: null,
    label: '公司依托西安电子科技大学雄厚的科研实力',
    note: '网络空间安全学科连续四年排名全国第一 人工智能排名全国前三',
    source: 'PPT p.93',
  },
  {
    value: '30+',
    unit: '篇',
    label: '国际顶会论文',
    note: '人工智能/网络安全/软件工程/国际顶会',
    source: 'PPT p.42 / p.85',
  },
];

describe('team metrics match homepage display metrics', () => {
  it('uses the homepage metric content in both source data and fallback snapshot', () => {
    expect(sourceTeam.metrics).toEqual(HOME_DISPLAY_METRICS);
    expect(snapshotTeam.metrics).toEqual(HOME_DISPLAY_METRICS);
  });
});
