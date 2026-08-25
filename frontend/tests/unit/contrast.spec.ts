// @vitest-environment node
/**
 * 对比度护栏（spec §10.3 规则 3）。
 *
 * 遍历 `tokens.css` 的前景 / 背景组合，对**任何被标记为文本用途的组合**
 * 断言 ≥ 4.5:1。这条比 axe 更早、更便宜地拦住回归 —— axe 要跑起浏览器才发现，
 * 这里在单测阶段就红。
 *
 * ⚠️ 实测结论（按 WCAG 2.1 相对亮度公式）：
 *   --ink-3 #8B97A7 对白 = 2.97:1  → 连大字号的 3:1 门槛都过不去
 *   --ink-4 #B5BEC9 对白 = 1.88:1  → 任何文本均不达标
 *   .lang-en #6A80A0 对 --navy-deep = 4.29:1 → 12px 文本需 4.5:1
 * 因此这三处**退出文本用途**（令牌值不改，改的是用色规则）。
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const STYLES_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/styles');
const tokens = readFileSync(path.join(STYLES_DIR, 'tokens.css'), 'utf8');
const sections = readFileSync(path.join(STYLES_DIR, 'sections.css'), 'utf8');

function tokenValue(name: string): string {
  const match = tokens.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!match?.[1]) throw new Error(`tokens.css 中找不到 ${name}`);
  return match[1];
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE = '#FFFFFF';

/** 站点上实际承担**文本**的前景 / 背景组合。 */
const TEXT_PAIRS: [string, string, string][] = [
  ['正文 --ink / 白', tokenValue('--ink'), WHITE],
  ['次要正文 --ink-2 / 白', tokenValue('--ink-2'), WHITE],
  ['主色文本 --red / 白', tokenValue('--red'), WHITE],
  ['主色悬停 --red-dark / 白', tokenValue('--red-dark'), WHITE],
  ['标题 --navy / 白', tokenValue('--navy'), WHITE],
  ['副标题 --navy-2 / 白', tokenValue('--navy-2'), WHITE],
  ['正文 --ink / 浅灰底', tokenValue('--ink'), tokenValue('--bg-gray')],
  ['次要正文 --ink-2 / 浅灰底', tokenValue('--ink-2'), tokenValue('--bg-gray')],
  ['主色文本 --red / 浅灰底', tokenValue('--red'), tokenValue('--bg-gray')],
  ['标题 --navy / 浅灰底', tokenValue('--navy'), tokenValue('--bg-gray')],
  ['主色文本 --red / 主色浅底', tokenValue('--red'), tokenValue('--red-soft')],
  ['白字 / 主色底', WHITE, tokenValue('--red')],
  ['白字 / 海军蓝底', WHITE, tokenValue('--navy')],
  ['顶栏正文 --utility-fg / --navy-deep', tokenValue('--utility-fg'), tokenValue('--navy-deep')],
  ['顶栏 EN --utility-muted / --navy-deep', tokenValue('--utility-muted'), tokenValue('--navy-deep')],
  // --- v3 新增用色（§8 三条硬要求：新增文本颜色一律先过这里） ---
  // 检索结果的次要说明、目录未激活项、矩阵的「—」单元格 —— 这三处最容易
  // 顺手用上 --ink-3 / --ink-4，所以特意把它们的实际用色列进来。
  ['检索结果次要说明 --ink-2 / --cream', tokenValue('--ink-2'), tokenValue('--cream')],
  ['目录未激活项 --ink-2 / 白', tokenValue('--ink-2'), WHITE],
  ['矩阵「—」单元格 --ink-2 / 白', tokenValue('--ink-2'), WHITE],
  ['高亮命中 --red-dark / --red-soft', tokenValue('--red-dark'), tokenValue('--red-soft')],
  ['面板底栏 --ink-2 / --cream', tokenValue('--ink-2'), tokenValue('--cream')],
  ['检索筛选选中 白字 / --red', WHITE, tokenValue('--red')],
];

describe('WCAG 2.1 AA 对比度（正文门槛 4.5:1）', () => {
  it.each(TEXT_PAIRS)('%s', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('实测数值回归（防止令牌被悄悄改动）', () => {
  const CASES: [string, string, string, number][] = [
    ['--ink 对白', tokenValue('--ink'), WHITE, 15.78],
    ['--ink-2 对白', tokenValue('--ink-2'), WHITE, 7.27],
    ['--red 对白', tokenValue('--red'), WHITE, 6.44],
    ['--ink-3 对白（不达标，故退出文本用途）', tokenValue('--ink-3'), WHITE, 2.97],
    ['--ink-4 对白（不达标，故退出文本用途）', tokenValue('--ink-4'), WHITE, 1.88],
    ['顶栏正文对 --navy-deep', tokenValue('--utility-fg'), tokenValue('--navy-deep'), 9.74],
    ['替代色 #8AA0BE 对 --navy-deep', '#8AA0BE', tokenValue('--navy-deep'), 6.46],
    ['ref 原值 #6A80A0 对 --navy-deep（不达标）', '#6A80A0', tokenValue('--navy-deep'), 4.29],
  ];

  it.each(CASES)('%s ≈ %s', (_label, fg, bg, expected) => {
    expect(contrastRatio(fg, bg)).toBeCloseTo(expected, 1);
  });
});

describe('§10.3 规则 1：--ink-3 / --ink-4 退出全部文本用途', () => {
  /**
   * 允许保留的是**非文本图形**用途：1px 分隔线、图标描边、禁用态图形。
   * 这里逐条检查 sections.css 里 ref 原本落在 --ink-3 / --ink-4 上的文本规则
   * 是否都已改用 --ink-2。
   */
  const TEXT_RULES = [
    '.domain-en',
    '.solution-category',
    '.news-item-date',
    '.footer-brand p',
    '.footer-bottom',
    '.submenu a .ext',
  ];

  it.each(TEXT_RULES)('%s 不再使用 --ink-3 / --ink-4', (selector) => {
    const pattern = new RegExp(
      `${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\{([^}]*)\\}`,
    );
    const match = sections.match(pattern);
    expect(match, `sections.css 中找不到 ${selector}`).toBeTruthy();
    const body = match?.[1] ?? '';
    expect(body).not.toMatch(/color:\s*var\(--ink-3\)/);
    expect(body).not.toMatch(/color:\s*var\(--ink-4\)/);
  });

  it('顶栏 EN 切换使用 --utility-muted 而不是 ref 的硬编码 #6A80A0', () => {
    expect(sections).toMatch(/\.utility-bar \.lang-en\s*\{\s*color:\s*var\(--utility-muted\)/);
    expect(sections).not.toMatch(/\.utility-bar \.lang-en\s*\{\s*color:\s*#6A80A0/);
  });

  it('--ink-3 / --ink-4 的令牌值本身未被改动', () => {
    expect(tokenValue('--ink-3')).toBe('#8B97A7');
    expect(tokenValue('--ink-4')).toBe('#B5BEC9');
  });
});
