/**
 * 命中词高亮。
 *
 * ⚠️ **全站禁止**把查询串交给 `dangerouslySetInnerHTML`（v3 spec §4.2.7 S1）。
 * 查询串来自 URL，是全站唯一的用户输入回显点，而 v2 的 CSP 明确选择了
 * `script-src 'self' 'unsafe-inline'`。本组件用 `splitHighlight()` 把文本切成
 * 片段，再用 React 的文本节点渲染 —— React 对文本节点做转义，
 * `<img src=x onerror=alert(1)>` 只会作为**字符**出现在页面上。
 *
 * `tests/unit/highlight.spec.tsx` 断言：以该载荷为 query 渲染时，
 * DOM 中不出现 `img` 元素，只出现文本节点与 `mark`。
 */

import { splitHighlight } from '@/lib/search';

interface Props {
  text: string;
  tokens: readonly string[];
}

export function Highlight({ text, tokens }: Props) {
  const segments = splitHighlight(text, tokens);
  return (
    <>
      {/* 片段没有天然 key，但同一段文本的切分顺序是确定的，索引可用 */}
      {segments.map((segment, index) =>
        segment.hit ? (
          <mark key={`${index}-${segment.text}`}>{segment.text}</mark>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        ),
      )}
    </>
  );
}
