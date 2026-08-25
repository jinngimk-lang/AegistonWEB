import { formatSlides } from '@/lib/format';

/**
 * 内容溯源标注（G2「内容 100% 来自 PPT V7，不臆造数据」的页面落点）。
 * 每个内容块都能指回 PPT 页码。
 */
export function SourceNote({ slides, prefix = '内容来源：' }: { slides: readonly number[]; prefix?: string }) {
  if (slides.length === 0) return null;
  return <p className="source-note">{prefix}{formatSlides(slides)}</p>;
}
