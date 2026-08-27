/**
 * 企业理念三张价值卡（ref `.philosophy` / `.philosophy-head` / `.values`）。
 *
 * ⚠️ ref 里有 `.philosophy-head .section-label{justify-content:center}` 与
 * `.philosophy-head .section-title .em` 这类跨组件后代选择器 —— 这正是
 * spec P0-2 要求样式必须留在全局层的直接原因。本组件只输出字符串字面量类名。
 */

import { Reveal } from '@/components/ui/Reveal';
import type { TitleSegment, ValueCard } from '@/types/content';

interface Props {
  eyebrow: string;
  title: TitleSegment[];
  description: string;
  values: ValueCard[];
}

export function PhilosophyValues({ eyebrow, title, description, values }: Props) {
  return (
    <section className="section philosophy" aria-labelledby="philosophy-title">
      <div className="container philosophy-inner">
        <Reveal className="philosophy-head">
          <div className="section-label">{eyebrow}</div>
          <h2 className="section-title" id="philosophy-title">
            {title.map((segment, index) => (
              <span key={`${segment.text}-${index}`}>
                {segment.em ? <span className="em">{segment.text}</span> : segment.text}
                {segment.lineBreakAfter ? <br /> : null}
              </span>
            ))}
          </h2>
          <p className="section-desc">{description}</p>
        </Reveal>

        <div className="values">
          {values.map((value, index) => (
            <Reveal key={value.num} delay={index as 0 | 1 | 2 | 3} className="value">
              <div className="value-num">{value.num}</div>
              {/* 视觉仍用 ref 的 h4 selector；可访问层级是 section h2 的直接子级。 */}
              <h4 role="heading" aria-level={3}>
                {value.title}
              </h4>
              <span className="value-en">{value.titleEn}</span>
              <p>{value.description}</p>
              <div className="quote">{value.quote}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
