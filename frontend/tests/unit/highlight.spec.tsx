/**
 * 高亮组件**不产生 HTML**（v3 spec §10.2 / §4.2.7 S1）。
 *
 * 为什么这条值得单独一个文件：`/search?q=…` 是全站**唯一**的用户输入回显点，
 * 而 v2 的 CSP 选了 `script-src 'self' 'unsafe-inline'` —— 那个取舍的三条前提
 * 之一就是「站内不存在用户输入的回显路径」。这条前提现在由 `Highlight.tsx`
 * 亲手守着。
 *
 * 断言方式：**渲染成 HTML 字符串 → 交给浏览器解析 → 看长出了什么元素**。
 * 这比 `expect(html).not.toContain('<img')` 强得多 —— 后者只是在检查字符，
 * 前者检查的是「浏览器会不会真的把它当成标记」。
 * 用 `renderToStaticMarkup` 而不是 Testing Library，是因为这里根本不需要
 * 交互，也就不必去处理 React 19 的 `act()` 与生产构建条件。
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Highlight } from '@/components/search/Highlight';

const XSS = '<img src=x onerror=alert(1)>';
const SCRIPT = '"></script><script>alert(1)</script>';

/** 渲染 → 交给浏览器解析 → 返回真实 DOM。 */
function parse(markup: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = markup;
  return host;
}

describe('Highlight', () => {
  it('以恶意载荷为查询词渲染时，DOM 中不出现 img / script 元素', () => {
    const markup = renderToStaticMarkup(
      <Highlight text={`结果 ${XSS} 结束`} tokens={['img', 'src']} />,
    );
    const dom = parse(markup);
    expect(dom.querySelectorAll('img')).toHaveLength(0);
    expect(dom.querySelectorAll('script')).toHaveLength(0);
    // 载荷原样作为**文本**出现
    expect(dom.textContent).toBe(`结果 ${XSS} 结束`);
  });

  it('闭合 script 标签的载荷同样只是文本', () => {
    const markup = renderToStaticMarkup(<Highlight text={SCRIPT} tokens={['script']} />);
    const dom = parse(markup);
    expect(dom.querySelectorAll('script')).toHaveLength(0);
    expect(dom.textContent).toBe(SCRIPT);
  });

  it('文本本身是恶意载荷、没有命中词时，也只作为文本渲染', () => {
    const dom = parse(renderToStaticMarkup(<Highlight text={XSS} tokens={[]} />));
    expect(dom.querySelector('img')).toBeNull();
    expect(dom.textContent).toBe(XSS);
  });

  it('命中词包在 <mark> 里', () => {
    const dom = parse(renderToStaticMarkup(<Highlight text="合约智审平台" tokens={['合约']} />));
    const marks = dom.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe('合约');
    expect(dom.textContent).toBe('合约智审平台');
  });

  it('只产生 mark / span 两种元素，不产生任何其他标记', () => {
    const dom = parse(
      renderToStaticMarkup(<Highlight text={`<b>粗体</b> 与 ${XSS}`} tokens={['粗体', 'img']} />),
    );
    const tags = new Set(Array.from(dom.querySelectorAll('*')).map((el) => el.tagName));
    for (const tag of tags) expect(['MARK', 'SPAN']).toContain(tag);
    expect(tags.size).toBeGreaterThan(0);
  });
});
