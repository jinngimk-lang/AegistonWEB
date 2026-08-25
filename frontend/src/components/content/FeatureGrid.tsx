import { Reveal } from '@/components/ui/Reveal';
import type { FeatureItem } from '@/types/content';

interface Props {
  items: FeatureItem[];
  cols?: 2 | 3 | 4;
}

/** 通用特性网格（`.feature-grid`，沿用 ref `.domains` 的 1px 分隔栅格语言）。 */
export function FeatureGrid({ items, cols = 3 }: Props) {
  return (
    <div className="feature-grid" data-cols={cols === 3 ? undefined : String(cols)}>
      {items.map((item, index) => (
        <Reveal key={item.index} delay={(index % 4) as 0 | 1 | 2 | 3} className="feature-item">
          <div className="feature-index">{item.index}</div>
          <h4>{item.title}</h4>
          <p>{item.description}</p>
        </Reveal>
      ))}
    </div>
  );
}
