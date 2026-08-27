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

const HERO_FIELDS = [
  'eyebrow',
  'title',
  'description',
  'tierLabel',
  'nameCn',
  'nameEn',
  'code',
  'tagline',
  'positioning',
  'industry',
  'customer',
  'lead',
  'deployment',
  'delivery',
];

const STATIC_FIRST_SCREEN_TEXT = [
  // /contact 的 PageHero 文案直接写在页面组件中，不来自内容快照。
  'CONTACT',
  '与智瞳安宇一起，构建值得信任的智能未来',
  '无论您关注的是研发流程的人机协同、通用智能体的安全边界，还是合同链条上的风险穿透，我们都欢迎带着真实问题的对话。',
  // PageHero 的固定 meta 键和直接入口通用 UI。
  '定位 交付 界面导览 行业 部署 屏真实截图',
];

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
 * 收集全站“首屏可见”字符，用来决定哪些 unicode-range 分片进入 fonts-critical.css。
 *
 * 首页、品牌和导航保持原有口径；内页仅加入 Hero 顶层字段；洞察详情只取列表项
 * 的标题/分类/摘要，因为这些字段会直接进入详情页首屏，而 bodyHtml 明确不进入。
 */
export async function collectCriticalFirstScreenText() {
  const [settings, nav, home, insightsDetail] = await Promise.all([
    readSnapshot('site-settings.json'),
    readSnapshot('site-navigation.json'),
    readSnapshot('home.json'),
    readSnapshot('insights-detail.json'),
  ]);

  const parts = [
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
    ...STATIC_FIRST_SCREEN_TEXT,
  ];

  for (const file of HERO_SNAPSHOT_FILES) {
    const snapshot = await readSnapshot(file);
    for (const field of HERO_FIELDS) pushValue(parts, snapshot[field]);
  }

  for (const item of insightsDetail.items ?? []) {
    pushValue(parts, item.categoryLabel);
    pushValue(parts, item.title);
    pushValue(parts, item.excerpt);
  }

  return parts.filter(Boolean).join(' ');
}
