import { Reveal } from '@/components/ui/Reveal';
import { formatSlides } from '@/lib/format';
import type { TechPillar } from '@/types/content';

/**
 * 技术模块卡（`.pillar`）。
 * 每一项技术都按同一个结构说明：被收敛的不确定性 → 核心机制 →
 * 关键设计与工程参数 → 工程价值。
 */
export function PillarCard({ pillar }: { pillar: TechPillar }) {
  return (
    <Reveal as="article" className="pillar" id={pillar.id}>
      <div className="pillar-head">
        <div>
          <h3>{pillar.title}</h3>
        </div>
        <span className="pillar-tag">{pillar.productLabel}</span>
      </div>
      <p className="pillar-lead">{pillar.lead}</p>

      <div className="pillar-rows">
        <div className="pillar-row">
          <h5 role="heading" aria-level={4}>
            {pillar.uncertaintyLabel}
          </h5>
          <p>{pillar.uncertainty}</p>
        </div>
        <div className="pillar-row">
          <h5 role="heading" aria-level={4}>
            核心机制
          </h5>
          <p>{pillar.mechanism}</p>
        </div>
        <div className="pillar-row">
          <h5 role="heading" aria-level={4}>
            关键设计与工程参数
          </h5>
          <ul className="pillar-params">
            {pillar.parameters.map((param) => (
              <li key={param}>{param}</li>
            ))}
          </ul>
        </div>
        <div className="pillar-row">
          <h5 role="heading" aria-level={4}>
            工程价值
          </h5>
          <p>{pillar.value}</p>
        </div>
      </div>

      {pillar.highlights.length > 0 ? (
        <div className="pillar-highlights">
          {pillar.highlights.map((highlight) => (
            <div className="pillar-highlight" key={highlight.label}>
              <div className="v">
                {highlight.value}
                {highlight.unit ? <span> {highlight.unit}</span> : null}
              </div>
              <div className="l">{highlight.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {pillar.sourceSlides.length > 0 ? (
        <p className="source-note">内容来源：{formatSlides(pillar.sourceSlides)}</p>
      ) : null}
    </Reveal>
  );
}
