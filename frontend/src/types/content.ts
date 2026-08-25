/**
 * 内容模型的前端类型。
 *
 * **单一事实源在后端**（`backend/app/schemas/*.py`）。本文件是它的手写镜像，
 * 用于组件与页面的类型标注；`src/types/api.d.ts` 是由 `npm run gen:types`
 * （openapi-typescript）从运行中的 API 生成的完整 OpenAPI 类型，用于交叉校验。
 * 两者若出现分歧，以后端 schema 为准。
 */

import type { InsightCategory, ProductSlug, SolutionSlug } from '@/lib/routes';

export type MediaKind = 'screenshot' | 'diagram' | 'photo' | 'video';

export interface MediaAsset {
  id: string;
  src: string;
  kind: MediaKind;
  width: number;
  height: number;
  blurDataUrl: string;
  alt: string;
  caption?: string | null;
  sourceSlide?: number | null;
  alsoOn?: number[];
  product?: string | null;
  sourceMedia?: string | null;
  poster?: string | null;
  videoSrc?: string | null;
  /** 含隐私打码区（spec §6.4），/legal/credits 据此对外说明。 */
  redacted?: boolean;
}

export interface StockCredit {
  id: string;
  src: string;
  width: number;
  height: number;
  blurDataUrl: string;
  alt: string;
  source: 'unsplash' | 'wikimedia';
  photoId: string;
  author?: string | null;
  authorUrl?: string | null;
  license: string;
  licenseUrl?: string | null;
  originUrl?: string | null;
}

export interface MediaManifest {
  assets: MediaAsset[];
  stock: StockCredit[];
}

export interface Metric {
  value: string;
  unit?: string | null;
  label: string;
  note?: string | null;
  source?: string | null;
}

export interface HomeMetric extends Metric {
  note: string;
}

export interface CaseMetric extends Metric {
  before?: string | null;
}

export interface CtaBlock {
  title: string;
  description?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}

export interface FeatureItem {
  index: string;
  title: string;
  description: string;
  icon?: string | null;
}

export interface FeatureGroup {
  title: string;
  countLabel?: string | null;
  items: FeatureItem[];
}

export interface ScreenSection {
  id: string;
  eyebrow: string;
  title: string;
  description?: string | null;
  points: string[];
  mediaId: string;
  layout: 'left' | 'right';
  sourceSlide?: number | null;
}

export interface LinkItem {
  label: string;
  href: string;
  external?: boolean;
  note?: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

/* --------------------------------------------------------------------- site */

export interface ContactInfo {
  businessEmail: string;
  careersEmail: string;
  phone?: string | null;
  address?: string | null;
  workingHours?: string | null;
}

export interface SiteSettings {
  nameCn: string;
  nameEn: string;
  legalName: string;
  tagline: string;
  description: string;
  keywords: string[];
  contact: ContactInfo;
  icp?: string | null;
  copyrightYear: number;
  foundedNote?: string | null;
  pendingConfirmation: string[];
}

export interface NavGroup {
  label: string;
  href?: string | null;
  items: LinkItem[];
}

export interface Navigation {
  utilityLeft: LinkItem[];
  utilityRight: LinkItem[];
  main: NavGroup[];
  cta: LinkItem;
  footerColumns: NavGroup[];
  footerLegal: LinkItem[];
}

/* --------------------------------------------------------------------- home */

export interface TitleSegment {
  text: string;
  em: boolean;
  lineBreakAfter: boolean;
}

export interface HeroBlock {
  eyebrow: string;
  titleLead: string;
  titlePrefix: string;
  titleEm: string;
  subtitle: string;
  primary: LinkItem;
  secondary: LinkItem;
  media?: string | null;
}

export interface DomainCard {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  href: string;
  media?: string | null;
  photoClass: string;
}

export interface SolutionRow {
  id: string;
  code: string;
  category: string;
  title: string;
  titleEn: string;
  description: string;
  points: string[];
  primary: LinkItem;
  secondary?: LinkItem | null;
  media: string;
  vlabel: string;
}

export interface ValueCard {
  num: string;
  title: string;
  titleEn: string;
  description: string;
  quote: string;
}

export interface SustainBlockData {
  eyebrow: string;
  titleLead: string;
  titleEm: string;
  description: string;
  points: FeatureItem[];
  action: LinkItem;
  media?: string | null;
}

export interface InsightSummary {
  slug: string;
  title: string;
  category: InsightCategory;
  categoryLabel: string;
  excerpt: string;
  publishedAt: string;
  readingMinutes: number;
  heroMedia?: string | null;
  href: string;
  sourceSlides: number[];
}

/** 正文目录的一项。`anchor` 形如 `sec-1`，由后端注入并过 bleach 白名单。 */
export interface TocItem {
  level: 2 | 3;
  text: string;
  anchor: string;
}

export interface InsightDetail extends InsightSummary {
  bodyHtml: string;
  sources: string[];
  /** 以下四个是后端派生字段（v3 spec §5.1），内容包 JSON 里不出现。 */
  toc: TocItem[];
  related: InsightSummary[];
  prev: InsightSummary | null;
  next: InsightSummary | null;
}

export interface HomePage {
  hero: HeroBlock;
  domainsEyebrow: string;
  domainsTitleLead: string;
  domainsTitleEm: string;
  domainsDesc: string;
  domainsMore: LinkItem;
  domains: DomainCard[];
  solutionsEyebrow: string;
  solutionsTitleLead: string;
  solutionsTitleEm: string;
  solutionsTitleTail: string;
  solutionsDesc: string;
  solutions: SolutionRow[];
  philosophyEyebrow: string;
  philosophyTitle: TitleSegment[];
  philosophyDesc: string;
  values: ValueCard[];
  metrics: HomeMetric[];
  newsEyebrow: string;
  newsTitleLead: string;
  newsTitleEm: string;
  newsDesc: string;
  newsMore: LinkItem;
  insightsPreview: InsightSummary[];
  sustain: SustainBlockData;
  cta: CtaBlock;
  sourceSlides: number[];
}

/* ----------------------------------------------------------------- products */

export type ProductTier = 'organization' | 'general' | 'industry';

export interface ProductSummary {
  slug: ProductSlug;
  tier: ProductTier;
  tierLabel: string;
  nameCn: string;
  nameEn: string;
  tagline: string;
  positioning: string;
  audience: string;
  differentiator: string;
  capabilities: string[];
  customerValue: string;
  delivery: string;
  heroMedia?: string | null;
  href: string;
  sourceSlides: number[];
}

export interface LocalizedText {
  zh: string;
  en?: string | null;
}

export interface ProductDetail {
  slug: ProductSlug;
  tier: ProductTier;
  tierLabel: string;
  nameCn: string;
  nameEn: string;
  code: string;
  tagline: string;
  taglineLocalized?: LocalizedText | null;
  positioning: string;
  heroMedia?: string | null;
  background: FeatureItem[];
  coreValues: FeatureItem[];
  featureGroups: FeatureGroup[];
  screens: ScreenSection[];
  highlights: Metric[];
  pillars: string[];
  papers: string[];
  delivery: string[];
  cta: CtaBlock;
  sourceSlides: number[];
}

/**
 * 能力矩阵（v3 spec §6.1）。
 *
 * ⚠️ 取值只有三档，**没有 `roadmap`（规划中）**：前瞻性表述在《广告法》语境下
 * 是承诺，且 PPT 里没有可溯源的路线图口径。`none` 渲染为「—」，
 * **不使用 ✗ 或任何否定性图形**（决策 A-7）。
 */
export type CapabilityLevel = 'core' | 'supported' | 'none';

export interface CapabilityCell {
  productSlug: ProductSlug;
  level: CapabilityLevel;
  detail?: string | null;
}

export interface CapabilityRow {
  capability: string;
  note?: string | null;
  cells: CapabilityCell[];
  /** 内容溯源，必填且在页面上实际渲染（CLAUDE.md §4）。 */
  sourceSlides: number[];
}

export interface CapabilityMatrix {
  title: string;
  description?: string | null;
  rows: CapabilityRow[];
  sourceNote: string;
}

export interface ProductsOverview {
  eyebrow: string;
  title: string;
  description: string;
  products: ProductSummary[];
  foundationTitle: string;
  foundationDesc: string;
  foundation: FeatureItem[];
  footnote: string;
  cta: CtaBlock;
  sourceSlides: number[];
  /** 派生字段，来自 `backend/app/content/products/capability-matrix.json`。 */
  capabilityMatrix?: CapabilityMatrix | null;
}

export interface DeliveryForm {
  index: string;
  name: string;
  points: string[];
  fit: string;
  media?: string | null;
}

export interface DeploymentPage {
  title: string;
  lead: string;
  eyebrow: string;
  heroMedia?: string | null;
  policy: FeatureItem[];
  readiness: FeatureItem[];
  forms: DeliveryForm[];
  conclusion: string;
  cta: CtaBlock;
  sourceSlides: number[];
}

/* ---------------------------------------------------------------- solutions */

export interface SolutionSummary {
  slug: SolutionSlug;
  industry: string;
  customer: string;
  summary: string;
  deployment: string;
  heroMedia?: string | null;
  href: string;
  headlineMetrics: CaseMetric[];
  sourceSlides: number[];
}

export interface SolutionDetail {
  slug: SolutionSlug;
  industry: string;
  customer: string;
  eyebrow: string;
  lead: string;
  heroMedia?: string | null;
  deployment: string;
  scope: string[];
  workflow: string[];
  closure: string[];
  closureTitle: string;
  difficulty: string[];
  assets: string[];
  metrics: CaseMetric[];
  takeaway: string;
  relatedProduct?: string | null;
  pendingConfirmation: string[];
  cta: CtaBlock;
  sourceSlides: number[];
}

export interface SolutionsOverview {
  eyebrow: string;
  title: string;
  description: string;
  partnerTitle: string;
  partnerName: string;
  partnerDesc: string;
  solutions: SolutionSummary[];
  method: string[];
  footnote: string;
  cta: CtaBlock;
  sourceSlides: number[];
}

/* ----------------------------------------------------------------- research */

export interface TechPillar {
  id: string;
  product: ProductSlug;
  productLabel: string;
  title: string;
  lead: string;
  uncertainty: string;
  uncertaintyLabel: string;
  mechanism: string;
  parameters: string[];
  value: string;
  highlights: Metric[];
  media?: string | null;
  sourceSlides: number[];
}

export interface Paper {
  id: string;
  title: string;
  titleEn: string;
  venue: string;
  tier?: string | null;
  summary: string;
  problem: string;
  method: string;
  result: string;
  benchmarks: string[];
  mapsTo: string[];
  products: string[];
  landing?: string | null;
  sourceSlides: number[];
}

export interface ResearchOverview {
  eyebrow: string;
  title: string;
  description: string;
  heroMedia?: string | null;
  pillars: TechPillar[];
  highlights: Metric[];
  footnote: string;
  cta: CtaBlock;
  sourceSlides: number[];
}

export interface PapersPage {
  eyebrow: string;
  title: string;
  description: string;
  papers: Paper[];
  highlights: Metric[];
  footnote: string;
  cta: CtaBlock;
  sourceSlides: number[];
}

/* -------------------------------------------------------------------- about */

export interface CompanyFact {
  label: string;
  body: string;
}

export interface ProductTierBrief {
  tier: string;
  name: string;
  href: string;
}

export interface AboutPage {
  eyebrow: string;
  title: string;
  lead: string;
  heroMedia?: string | null;
  intro: string;
  facts: CompanyFact[];
  focus: string;
  positioningTitle: string;
  positioningLead: string;
  positioningBody: string;
  tiers: ProductTierBrief[];
  metrics: Metric[];
  strengthTitle: string;
  strengthLead: string;
  strength: FeatureItem[];
  cta: CtaBlock;
  sourceSlides: number[];
}

export interface TeamMember {
  name: string;
  role: string;
  degree?: string | null;
  bio: string[];
  highlights: string[];
}

export interface TeamPage {
  eyebrow: string;
  title: string;
  lead: string;
  heroMedia?: string | null;
  origin: string[];
  leader: TeamMember;
  leaderRoles: string[];
  members: TeamMember[];
  metrics: Metric[];
  cta: CtaBlock;
  sourceSlides: number[];
}

export interface CareersPage {
  eyebrow: string;
  title: string;
  lead: string;
  heroMedia?: string | null;
  why: FeatureItem[];
  openings: FeatureItem[];
  process: string[];
  contactNote: string;
  cta: CtaBlock;
  sourceSlides: number[];
}

/* -------------------------------------------------------------------- leads */

export type LeadIntent = 'demo' | 'consult' | 'trial' | 'partner' | 'career';
export type LeadProduct = 'aragonteam' | 'inkclaw' | 'legallens' | 'platform';

export interface LeadCreated {
  id: string;
  createdAt: string;
  duplicate: boolean;
}

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  requestId?: string;
  errors?: { field: string; code: string }[];
}

/* ------------------------------------------------------------------- routes */

export interface RouteEntry {
  path: string;
  changeFrequency: string;
  priority: number;
  lastModified?: string;
}

export interface RoutesPayload {
  routes: RouteEntry[];
  count: number;
}
