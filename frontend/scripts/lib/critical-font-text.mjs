import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SNAPSHOT_DIR = path.join(ROOT, 'src', 'content', 'snapshot');

/**
 * 只取“直接进入该路由时首屏就会渲染”的顶层字段。
 * 不递归正文/卡片，避免把整站字库重新拖回关键渲染路径。
 */
const HERO_SNAPSHOT_FILES = [
  'about.json',
  'about-careers.json',
  'about-team.json',
  'insights.json',
  'products.json',
  'products-deployment.json',
  'product-aragonteam.json',
  'product-inkclaw.json',
  'product-legallens.json',
  'research-pillars.json',
  'solutions.json',
  'solution-finance.json',
  'solution-legal-services.json',
  'solution-telecom.json',
  'solution-transportation.json',
];

const TITLE_FIELDS = ['title', 'nameCn', 'nameEn', 'customer'];
const BODY_FIELDS = ['description', 'tagline', 'positioning', 'lead', 'industry', 'deployment', 'delivery'];
const LABEL_FIELDS = ['eyebrow', 'tierLabel', 'code'];

const CONTACT_TITLE = '与智瞳安宇一起，构建值得信任的智能未来';
const CONTACT_DESCRIPTION =
  '无论您关注的是研发流程的人机协同、通用智能体的安全边界，还是合同链条上的风险穿透，我们都欢迎带着真实问题的对话。';

async function readSnapshot(file) {
  return JSON.parse(await readFile(path.join(SNAPSHOT_DIR, file), 'utf8'));
}

function pushValue(parts, value) {
  if (typeof value === 'string' && value) {
    parts.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item) parts.push(item);
    }
  }
}

/**
 * 返回按实际字体角色分组的首屏文本：
 * - baseText：保持原有首页/品牌/导航口径，生成器继续按旧逻辑覆盖所有相关分片；
 * - heroTitleText：PageHero h1，固定是 Noto Serif SC 700；
 * - heroBodyText：PageHero 副标题/元信息，使用 Noto Sans SC 300/400；
 * - heroLabelText：section-label / 中文 eyebrow，600 会按现有字体声明回退到 700。
 */
export async function collectCriticalFontInputs() {
  const [settings, nav, home, insightsDetail] = await Promise.all([
    readSnapshot('site-settings.json'),
    readSnapshot('site-navigation.json'),
    readSnapshot('home.json'),
    readSnapshot('insights-detail.json'),
  ]);

  const base = [
    settings.nameCn,
    settings.nameEn,
    settings.tagline,
    home.hero.eyebrow,
    home.hero.titleLead,
    home.hero.titlePrefix,
    home.hero.titleEm,
    home.hero.subtitle,
    home.hero.primary?.label,
    home.hero.secondary?.label,
    nav.cta?.label,
    ...(nav.main ?? []).map((group) => group.label),
    ...(nav.utilityLeft ?? []).map((item) => item.label),
    ...(nav.utilityRight ?? []).map((item) => item.label),
    '⌘K Ctrl 搜索 站内检索 跳到主要内容 返回顶部',
  ];

  const titles = [CONTACT_TITLE];
  const body = [
    CONTACT_DESCRIPTION,
    '定位 交付 界面导览 行业 部署 发布 阅读 屏真实截图',
  ];
  const labels = ['CONTACT'];

  for (const file of HERO_SNAPSHOT_FILES) {
    const snapshot = await readSnapshot(file);
    for (const field of TITLE_FIELDS) pushValue(titles, snapshot[field]);
    for (const field of BODY_FIELDS) pushValue(body, snapshot[field]);
    for (const field of LABEL_FIELDS) pushValue(labels, snapshot[field]);
  }

  // 洞察详情是集合快照：只取详情页首屏字段，明确排除 bodyHtml / toc / related。
  for (const item of insightsDetail.items ?? []) {
    pushValue(titles, item.title);
    pushValue(body, item.excerpt);
    pushValue(labels, item.categoryLabel);
  }

  return {
    baseText: base.filter(Boolean).join(' '),
    heroTitleText: titles.filter(Boolean).join(' '),
    heroBodyText: body.filter(Boolean).join(' '),
    heroLabelText: labels.filter(Boolean).join(' '),
  };
}

/** 测试/诊断用的总字符视图；生成器本身使用上面的角色化结果。 */
export async function collectCriticalFirstScreenText() {
  const inputs = await collectCriticalFontInputs();
  return Object.values(inputs).join(' ');
}
