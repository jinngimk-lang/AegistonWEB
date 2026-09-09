/**
 * 首页 —— 与 `ref/1.html` 的区块一一对应（spec §3.2）。
 *
 * DOM 顺序即 ref 顺序：
 * hero → domains → solutions → philosophy → metrics → news → sustain → cta
 *
 * `.hero` 的字号/间距/遮罩层、`.domains` 的 1px 分隔栅格、`.solution` 的
 * `1fr 1fr / gap:72px` 交错布局、`.metrics` 的分隔竖线、`.news-grid` 的
 * `1.15fr 1fr` —— 全部像素级沿用，只替换文案与图片。
 */

import { CtaBand } from '@/components/sections/CtaBand';
import { DomainGrid } from '@/components/sections/DomainGrid';
import { Hero } from '@/components/sections/Hero';
import { InsightsPreview } from '@/components/sections/InsightsPreview';
import { MetricBand } from '@/components/sections/MetricBand';
import { PhilosophyValues } from '@/components/sections/PhilosophyValues';
import { SolutionRows } from '@/components/sections/SolutionRows';
import { SustainBlock } from '@/components/sections/SustainBlock';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/SectionHead';
import { getHome } from '@/lib/api';
import { getMediaLookup } from '@/lib/media';

export const revalidate = 300;

export default async function HomePage() {
  const [home, media] = await Promise.all([getHome(), getMediaLookup()]);
  const metrics = home.metrics.map((metric) => {
    if (metric.value === '全国顶尖') {
      return {
        ...metric,
        label: '公司依托西安电子科技大学雄厚的科研实力',
        note: '网络空间安全学科连续四年排名全国第一 人工智能排名全国前三',
      };
    }
    if (metric.label === '国际顶会论文' && metric.unit === '篇') {
      return {
        ...metric,
        value: '30+',
        note: '人工智能/网络安全/软件工程/国际顶会',
      };
    }
    return metric;
  });
  const solutionRows = home.solutions.map((row) => {
    if (row.id === 'aragonteam') {
      return {
        ...row,
        code: '组织级',
        category: '企业 AI 原生人机协同工作站',
        title: 'AegisTeam',
      };
    }
    if (row.id === 'inkclaw') {
      return {
        ...row,
        code: '通用级',
        category: '线上安全通用智能体',
        title: 'AegisClaw',
      };
    }
    if (row.id === 'legallens') {
      return {
        ...row,
        code: '行业级',
        category: '合同智能审核系统',
        title: 'AegisLens 合约智审',
      };
    }
    return row;
  });

  return (
    <>
      <Hero hero={home.hero} media={media.get(home.hero.media)} />

      {/* 业务领域 */}
      <section className="section" aria-labelledby="domains-title">
        <div className="container">
          <SectionHead
            label={home.domainsEyebrow}
            titleLead={home.domainsTitleEm}
            description={home.domainsDesc}
            more={{ label: home.domainsMore.label, href: home.domainsMore.href }}
          />
          <span id="domains-title" className="visually-hidden">
            {home.domainsTitleEm}
          </span>
          <DomainGrid domains={home.domains} media={media} />
        </div>
      </section>

      {/* 三层产品 */}
      <section className="section section-gray" id="products" aria-labelledby="solutions-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">{home.solutionsEyebrow}</div>
            <h2 className="section-title" id="solutions-title">
              {home.solutionsTitleLead}
              <br />
              <span className="em">{home.solutionsTitleEm}</span>
              {home.solutionsTitleTail}
            </h2>
            <p className="section-desc">{home.solutionsDesc}</p>
          </Reveal>
          <SolutionRows rows={solutionRows} media={media} />
        </div>
      </section>

      <PhilosophyValues
        eyebrow={home.philosophyEyebrow}
        title={home.philosophyTitle}
        description={home.philosophyDesc}
        values={home.values}
      />

      <MetricBand metrics={metrics} />

      {/* 洞察与动态 */}
      <section className="section section-gray" id="insights" aria-labelledby="news-title">
        <div className="container">
          <SectionHead
            label={home.newsEyebrow}
            titleLead={home.newsTitleLead}
            titleEm={home.newsTitleEm}
            description={home.newsDesc}
            more={{ label: home.newsMore.label, href: home.newsMore.href }}
          />
          <span id="news-title" className="visually-hidden">
            {home.newsTitleLead}
            {home.newsTitleEm}
          </span>
          <InsightsPreview items={home.insightsPreview} media={media} />
        </div>
      </section>

      {/* 私有化与一体机 */}
      <section className="section" id="deployment" aria-label="私有化与一体机">
        <div className="container">
          <SustainBlock data={home.sustain} media={media.get(home.sustain.media)} />
        </div>
      </section>

      <CtaBand cta={home.cta} />
    </>
  );
}
