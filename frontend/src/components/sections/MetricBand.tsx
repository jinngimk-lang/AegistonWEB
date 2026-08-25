/**
 * 数据条（ref `.metrics`）。
 *
 * ⚠️ spec §3.2 强制：首页 `.metrics` 的 `note`（归属说明）必须**实际渲染出来**，
 * 不能只存在数据里。PPT p.93 的「全国第 1」是**西安电子科技大学**的学科评估
 * 结果，不是本公司排名；与「20+ 博士硕士」并列且不加说明会触及《广告法》
 * 第九条与第二十八条。`HomeMetric` 在 schema 层已把 `note` 设为必填。
 */

import { Reveal } from '@/components/ui/Reveal';
import type { HomeMetric, Metric } from '@/types/content';

interface Props {
  metrics: (HomeMetric | Metric)[];
  showNotes?: boolean;
  labelledBy?: string;
}

export function MetricBand({ metrics, showNotes = true, labelledBy }: Props) {
  return (
    <section className="metrics" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : '核心数据'}>
      <div className="container">
        <div className="metrics-grid">
          {metrics.map((metric, index) => (
            <Reveal key={metric.label} delay={(index % 4) as 0 | 1 | 2 | 3} className="metric">
              <div className="metric-num">
                {metric.value}
                {metric.unit ? <span className="unit">{metric.unit}</span> : null}
              </div>
              <div className="metric-label">{metric.label}</div>
              {showNotes && metric.note ? <p className="metric-note">{metric.note}</p> : null}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
