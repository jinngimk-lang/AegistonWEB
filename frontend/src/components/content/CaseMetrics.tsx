import { Reveal } from '@/components/ui/Reveal';
import type { CaseMetric } from '@/types/content';

/** 行业案例的效能指标（`.case-metrics`）。`before` 渲染为对照基线。 */
export function CaseMetrics({ metrics }: { metrics: CaseMetric[] }) {
  if (metrics.length === 0) return null;
  return (
    <Reveal className="case-metrics">
      {metrics.map((metric) => (
        <div className="case-metric" key={metric.label}>
          <div className="v">
            {metric.value}
            {metric.unit ? <span className="unit">{metric.unit}</span> : null}
          </div>
          <div className="l">{metric.label}</div>
          {metric.before ? <div className="b">{metric.before}</div> : null}
        </div>
      ))}
    </Reveal>
  );
}
