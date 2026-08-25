import { Reveal } from '@/components/ui/Reveal';
import { formatSlides } from '@/lib/format';
import type { Paper } from '@/types/content';

/** 论文卡（`.paper`）。问题 → 方法 → 结果 → 落点，四段固定结构。 */
export function PaperCard({ paper }: { paper: Paper }) {
  return (
    <Reveal as="article" className="paper" id={paper.id}>
      <div className="paper-venue">
        <span className="v">{paper.venue}</span>
        {paper.tier ? <span className="t">{paper.tier}</span> : null}
      </div>
      <h3>{paper.title}</h3>
      <p className="paper-title-en">{paper.titleEn}</p>

      <div className="paper-rows">
        <div className="paper-row">
          <h5>问题</h5>
          <p>{paper.problem}</p>
        </div>
        <div className="paper-row">
          <h5>方法</h5>
          <p>{paper.method}</p>
        </div>
        <div className="paper-row">
          <h5>实测</h5>
          <p>{paper.result}</p>
        </div>
        {paper.landing ? (
          <div className="paper-row">
            <h5>落点</h5>
            <p>{paper.landing}</p>
          </div>
        ) : null}
      </div>

      {paper.benchmarks.length > 0 ? (
        <div className="paper-bench">
          {paper.benchmarks.map((bench) => (
            <span key={bench}>{bench}</span>
          ))}
        </div>
      ) : null}

      {paper.sourceSlides.length > 0 ? (
        <p className="source-note">内容来源：{formatSlides(paper.sourceSlides)}</p>
      ) : null}
    </Reveal>
  );
}
