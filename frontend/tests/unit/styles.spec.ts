// @vitest-environment node
/**
 * 视觉契约在 CI 上唯一可自动化的锚点（spec §9.3 护栏 / 放行条件 C1）。
 *
 * 解析 `src/styles/sections.css`，断言 `ref/1.html` 的**跨元素后代选择器**
 * 逐条存在且拼写一致。这条测试比像素比对稳定得多：CJK Web 字体 + 跨平台渲染
 * 下的像素差本来就会抖动，而选择器是否存在是确定性的。
 *
 * 为什么这条测试必须有：CSS Modules 会把类名哈希成
 * `Button_btn-primary__x7f2`，写在 `CtaBand.module.css` 里的
 * `.cta-band .btn-primary` 编译后指向一个页面上根本不存在的类名。
 * 它**不报错、不告警、不进 lint**，只是样式没生效 —— 这类失效是静默的，
 * 排查成本极高。本测试把它变成可见的红灯。
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const STYLES_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src/styles');

function read(file: string): string {
  return readFileSync(path.join(STYLES_DIR, file), 'utf8');
}

const sections = read('sections.css');
const sectionsExt = read('sections-ext.css');
const tokens = read('tokens.css');
const base = read('base.css');
const responsive = read('responsive.css');

/** `.container` 属于基础层（base.css），其余结构性规则在 sections.css。 */
const structural = `${base}
${sections}`;

/** ref/1.html 中跨越了组件边界的后代选择器，逐条取自原文。 */
const CROSS_COMPONENT_SELECTORS = [
  '.cta-band .btn-primary',
  '.cta-band .btn-primary:hover',
  '.cta-band .btn-outline',
  '.cta-band .btn-outline:hover',
  '.philosophy-head .section-label',
  '.philosophy-head .section-label::before',
  '.philosophy-head .section-label::after',
  '.philosophy-head .section-title',
  '.philosophy-head .section-title .em',
  '.philosophy-head .section-desc',
  '.solutions-intro .section-label',
  '.solutions-intro .section-label::after',
  '.solutions-intro .section-desc',
  '.solution:nth-child(even) .solution-visual',
  '.solution:nth-child(even) .solution-body',
  '.solution-body .tag-line',
  '.solution-visual .vlabel',
  '.solution-point .check',
  '.metric:not(:last-child)::after',
  '.metric-num .unit',
  '.news-item-date .y',
  '.news-feature:hover h3',
  '.news-item:hover h4',
  '.footer-col a',
  '.footer-col a:hover',
  '.footer-brand .brand-text .cn',
  '.footer-brand .brand-mark',
  '.footer-bottom-links a:hover',
  '.submenu a .ext',
  '.submenu a:hover',
  '.nav-item:hover .submenu',
  '.nav-item:hover .caret',
  '.nav-item .caret',
  '.brand-text .cn',
  '.brand-text .en',
  '.domain:hover .domain-link',
  '.domain:hover .domain-icon',
  '.domain:hover::before',
  '.domain-photo::after',
  '.hero h1 .em',
  '.hero h1 .em::after',
  '.hero-eyebrow .dot',
  '.section-label::before',
  '.section-title .em',
  '.value .quote',
  '.sustain-body .section-desc',
  '.sustain-point h5',
  '.sustain-point p',
  '.sustain-visual::after',
  '.news-feature-img::after',
  '.btn .arrow',
  '.btn:hover .arrow',
  '.utility-bar a:hover',
  '.utility-bar .sep',
  '.utility-bar .lang',
  '.utility-bar .lang-en',
  '.cta-band h2',
  '.cta-band p',
  '.footer-col h5',
  '.footer-col ul li',
  '.philosophy::before',
];

/** §5.2 必须 1:1 复刻的度量，逐条断言取值。 */
const METRICS: [string, RegExp][] = [
  ['.container 最大宽度', /\.container\s*\{[^}]*max-width:\s*var\(--max-w\)/],
  ['.container 内边距', /\.container\s*\{[^}]*padding:\s*0\s+40px/],
  ['.utility-inner 高度 36px', /\.utility-inner\s*\{[^}]*height:\s*36px/],
  ['.nav-inner 高度 80px', /\.nav-inner\s*\{[^}]*height:\s*80px/],
  ['.nav sticky z-index 100', /\.nav\s*\{[^}]*z-index:\s*100/],
  ['.nav-item padding 28px 22px', /\.nav-item\s*\{[^}]*padding:\s*28px\s+22px/],
  ['.submenu min-width 240px', /\.submenu\s*\{[^}]*min-width:\s*240px/],
  ['.submenu 顶部 3px 主色边', /\.submenu\s*\{[^}]*border-top:\s*3px solid var\(--red\)/],
  ['.submenu 过渡 .22s', /\.submenu\s*\{[^}]*transition:\s*all\s*\.22s/],
  ['.hero min-height 640px', /\.hero\s*\{[^}]*min-height:\s*640px/],
  ['.hero h1 clamp', /\.hero h1\s*\{[^}]*clamp\(36px,\s*4\.6vw,\s*54px\)/],
  ['.btn padding 16px 34px', /\.btn\s*\{[^}]*padding:\s*16px\s+34px/],
  ['.btn letter-spacing .04em', /\.btn\s*\{[^}]*letter-spacing:\s*\.04em/],
  ['.section padding 96px', /\.section\s*\{\s*padding:\s*96px\s+0\s*\}/],
  ['.section-label 字间距 .28em', /\.section-label\s*\{[^}]*letter-spacing:\s*\.28em/],
  ['.section-title clamp', /\.section-title\s*\{[^}]*clamp\(26px,\s*3\.2vw,\s*38px\)/],
  ['.domains 四列 1px 栅格', /\.domains\s*\{[^}]*repeat\(4,\s*1fr\)[^}]*gap:\s*1px/],
  ['.domain-photo 高度 168px', /\.domain-photo\s*\{[^}]*height:\s*168px/],
  ['.domain-photo 负外边距', /\.domain-photo\s*\{[^}]*margin:\s*0\s+-28px\s+26px/],
  ['.solution 1fr 1fr / gap 72px', /\.solution\s*\{[^}]*1fr\s+1fr[^}]*gap:\s*72px/],
  ['.solution margin-bottom 96px', /\.solution\s*\{[^}]*margin-bottom:\s*96px/],
  ['.solution-points 两列', /\.solution-points\s*\{[^}]*1fr\s+1fr[^}]*gap:\s*12px\s+24px/],
  ['.solution-visual 4/3', /\.solution-visual\s*\{[^}]*aspect-ratio:\s*4\/3/],
  ['.values 三列 gap 20px', /\.values\s*\{[^}]*repeat\(3,\s*1fr\)[^}]*gap:\s*20px/],
  ['.value padding 40px 36px', /\.value\s*\{[^}]*padding:\s*40px\s+36px/],
  ['.metrics padding 72px', /\.metrics\s*\{[^}]*padding:\s*72px\s+0/],
  ['.metric-num 46px 700', /\.metric-num\s*\{[^}]*font-size:\s*46px[^}]*font-weight:\s*700/],
  ['.metric 分隔线 1×56px', /\.metric:not\(:last-child\)::after\s*\{[^}]*width:\s*1px[^}]*height:\s*56px/],
  ['.news-grid 1.15fr 1fr', /\.news-grid\s*\{[^}]*1\.15fr\s+1fr[^}]*gap:\s*56px/],
  ['.news-item 88px 1fr', /\.news-item\s*\{[^}]*88px\s+1fr[^}]*gap:\s*22px/],
  ['.sustain 1fr 1fr / 72px', /\.sustain\s*\{[^}]*1fr\s+1fr[^}]*gap:\s*72px/],
  ['.sustain-visual 5/4', /\.sustain-visual\s*\{[^}]*aspect-ratio:\s*5\/4/],
  ['.sustain-point-icon 44×44', /\.sustain-point-icon\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/],
  ['.cta-band padding 82px', /\.cta-band\s*\{[^}]*padding:\s*82px\s+0/],
  ['.cta-band::before 内嵌 18px', /\.cta-band::before\s*\{[^}]*inset:\s*18px/],
  ['.footer-main 五列', /\.footer-main\s*\{[^}]*1\.6fr\s+1fr\s+1fr\s+1fr\s+1fr[^}]*gap:\s*48px/],
  ['.totop 46×46 圆形', /\.totop\s*\{[^}]*width:\s*46px[^}]*height:\s*46px[^}]*border-radius:\s*50%/],
  ['.totop 定位 36/36', /\.totop\s*\{[^}]*bottom:\s*36px[^}]*right:\s*36px/],
];

describe('样式分层策略（spec §9.3 / 放行条件 C1）', () => {
  it('ref 的跨元素后代选择器逐条存在于全局层', () => {
    const missing = CROSS_COMPONENT_SELECTORS.filter((selector) => !sections.includes(selector));
    expect(missing).toEqual([]);
  });

  it('覆盖的跨组件选择器不少于 60 条', () => {
    expect(CROSS_COMPONENT_SELECTORS.length).toBeGreaterThanOrEqual(60);
  });

  it('sections.css 不使用 :global / composes（它本来就是全局层）', () => {
    expect(sections).not.toMatch(/:global/);
    expect(sections).not.toMatch(/\bcomposes\s*:/);
  });
});

describe('§5.2 必须 1:1 复刻的度量', () => {
  it.each(METRICS)('%s', (_label, pattern) => {
    expect(structural).toMatch(pattern);
  });
});

describe('§5.3 撤销条目：.reveal 必须原样搬运', () => {
  it('初始位移是 20px（不是 24px）', () => {
    expect(sections).toMatch(/\.reveal\s*\{[^}]*transform:\s*translateY\(20px\)/);
  });

  it('缓动是 .7s cubic-bezier(.2,.8,.2,1)', () => {
    expect(sections).toMatch(/\.reveal\s*\{[^}]*\.7s cubic-bezier\(\.2,\s*\.8,\s*\.2,\s*1\)/);
  });

  it('延迟档位为 .1s / .2s / .3s', () => {
    expect(sections).toMatch(/\.reveal-d1\s*\{\s*transition-delay:\s*\.1s\s*\}/);
    expect(sections).toMatch(/\.reveal-d2\s*\{\s*transition-delay:\s*\.2s\s*\}/);
    expect(sections).toMatch(/\.reveal-d3\s*\{\s*transition-delay:\s*\.3s\s*\}/);
  });

  it('reduced-motion 分支保留', () => {
    expect(responsive).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(responsive).toMatch(/\.reveal\s*\{\s*opacity:\s*1;\s*transform:\s*none\s*\}/);
    expect(responsive).toMatch(/animation:\s*none\s*!important/);
  });
});

describe('§5.2.1 响应式断点全量表（四档九条）', () => {
  it('四个断点都在，且没有引入 ref 之外的新档位', () => {
    const breakpoints = [...responsive.matchAll(/max-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(new Set(breakpoints)).toEqual(new Set([1024, 900, 768, 640]));
  });

  it('1024px：主导航切换 + domains 4→2 列', () => {
    expect(responsive).toMatch(/max-width:\s*1024px\)\s*\{\s*\.nav-menu\s*\{\s*display:\s*none\s*\}/);
    expect(responsive).toMatch(/\.domains\s*\{\s*grid-template-columns:\s*repeat\(2,\s*1fr\)\s*\}/);
  });

  it('900px 是主力断点：solution / values / news / sustain / footer 五条', () => {
    const block900 = responsive.split('@media (max-width: 900px)').slice(1, 7).join('\n');
    expect(block900).toMatch(/\.solution\s*\{\s*grid-template-columns:\s*1fr;\s*gap:\s*40px/);
    expect(block900).toMatch(/\.values\s*\{\s*grid-template-columns:\s*1fr\s*\}/);
    expect(block900).toMatch(/\.news-grid\s*\{\s*grid-template-columns:\s*1fr\s*\}/);
    expect(block900).toMatch(/\.sustain\s*\{\s*grid-template-columns:\s*1fr;\s*gap:\s*40px\s*\}/);
    expect(block900).toMatch(/\.footer-main\s*\{\s*grid-template-columns:\s*1fr\s+1fr/);
  });

  it('900px：偶数行 order 必须复位为 0（否则图文顺序错乱）', () => {
    expect(responsive).toMatch(
      /\.solution:nth-child\(even\)\s*\.solution-visual,\s*\.solution:nth-child\(even\)\s*\.solution-body\s*\{\s*order:\s*0\s*\}/,
    );
  });

  it('900px：footer 品牌列通栏', () => {
    expect(responsive).toMatch(/\.footer-brand\s*\{\s*grid-column:\s*1\/-1\s*\}/);
  });

  it('768px：metrics 4→2 列，同时隐藏分隔竖线', () => {
    expect(responsive).toMatch(/\.metrics-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*1fr\);\s*gap:\s*44px\s+24px\s*\}/);
    expect(responsive).toMatch(/\.metric:not\(:last-child\)::after\s*\{\s*display:\s*none\s*\}/);
  });

  it('640px：domains 2→1 列', () => {
    expect(responsive).toMatch(/max-width:\s*640px\)\s*\{\s*\.domains\s*\{\s*grid-template-columns:\s*1fr\s*\}/);
  });
});

describe('§5.1 设计令牌原样搬入', () => {
  const EXPECTED: [string, string][] = [
    ['--red', '#2D638A'],
    ['--red-dark', '#214A69'],
    ['--red-soft', '#EAF1F6'],
    ['--navy', '#002B5C'],
    ['--navy-deep', '#001A3D'],
    ['--navy-2', '#1A4A7A'],
    ['--ink', '#1A2332'],
    ['--ink-2', '#4A5868'],
    ['--ink-3', '#8B97A7'],
    ['--ink-4', '#B5BEC9'],
    ['--white', '#FFFFFF'],
    ['--cream', '#FAFBFC'],
    ['--bg-gray', '#F2F4F7'],
    ['--bg-gray-2', '#EAEEF3'],
    ['--border', '#E0E5EC'],
    ['--border-2', '#CDD5DF'],
    ['--border-strong', '#A8B4C2'],
    ['--max-w', '1280px'],
  ];

  it.each(EXPECTED)('%s = %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  it('变量名不得重命名（--red 实际是企业蓝，保留以便与 ref 逐条比对）', () => {
    expect(tokens).not.toMatch(/--brand-blue|--primary:/);
  });

  it('base.css 补齐了 ref 缺失的键盘焦点样式', () => {
    expect(base).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--focus-ring\)/);
    expect(base).toMatch(/\.skip-link/);
  });
});


/**
 * v3 新增区块的**归属**断言（§8 / 放行条件 C3）。
 *
 * 凡与 ref 类名（`.nav` / `.article` / `.card` / `.section`）发生后代关系的
 * 规则，必须留在全局层 `sections-ext.css`。写进 CSS Module 会被哈希成页面上
 * 不存在的类名 —— 不报错、不告警、不进 lint，只是样式没生效。
 *
 * ⚠️ 这条测试守不住「目录真的在正文右边」，那需要人眼看（C3 明说了）。
 * 它守的是「定位上下文没有被挪进 Module」。
 */
describe('v3 新增全局类必须留在 sections-ext.css（CLAUDE.md §1）', () => {
  const GLOBAL_RULES: [string, RegExp][] = [
    ['顶栏检索按钮还原为 <button>', /\.nav-search\s*\{[^}]*background:\s*none[^}]*border:\s*0/],
    ['⌘K 提示徽标', /\.nav-search-hint\s*\{/],
    ['命中区扩到 44×44（视觉圆形仍 40px）', /\.nav-search::after\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/],
    ['目录定位上下文建在 .article 这一层', /\.article-layout\s*\{[^}]*display:\s*grid/],
    ['目录轨道 sticky 让开顶栏', /\.article-rail\s*\{[^}]*position:\s*sticky/],
    ['锚点不被固定顶栏遮挡', /\.article h2[^{]*\{[^}]*scroll-margin-top:\s*calc\(var\(--header-h\)/],
    ['上一篇/下一篇', /\.article-nav\s*\{[^}]*display:\s*grid/],
    ['相关阅读复用全局 .card-grid', /\.related-block \.card-grid\s*\{/],
    ['能力矩阵可横向滚动区域', /\.matrix-scroll\s*\{[^}]*overflow-x:\s*auto/],
    ['能力矩阵首列 sticky 且背景不透明', /\.capability-matrix tbody th\s*\{[^}]*position:\s*sticky[^}]*background:\s*var\(--white\)/],
    ['检索页表单与 .btn-primary 的后代关系', /\.search-field \.btn-primary\s*\{/],
  ];

  it.each(GLOBAL_RULES)('%s', (_label, pattern) => {
    expect(sectionsExt).toMatch(pattern);
  });

  it('--header-h 令牌存在且是 .nav-inner 的实测高度', () => {
    expect(tokens).toMatch(/--header-h:\s*80px/);
    expect(sections).toMatch(/\.nav-inner\s*\{[^}]*height:\s*80px/);
  });

  it('新增区块没有把 --ink-3 / --ink-4 用于文本', () => {
    // 这两个令牌只保留 1px 分隔线、图标描边、禁用态图形等非文本图形用途
    // （CLAUDE.md §2）。检索结果次要说明、目录未激活项、矩阵「—」是最容易犯的三处。
    const v3Block = sectionsExt.slice(sectionsExt.indexOf('v3 增量'));
    expect(v3Block).not.toMatch(/color:\s*var\(--ink-3\)/);
    expect(v3Block).not.toMatch(/color:\s*var\(--ink-4\)/);
  });
});
