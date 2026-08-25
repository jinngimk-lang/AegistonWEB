/**
 * 顶栏（ref `.utility-bar`）。
 *
 * spec §2.2：v1 只做 zh-CN，EN 入口渲染为 `aria-disabled` 并带
 * `title="英文站建设中"`；内容 schema 的文案字段已预留 `en`（见
 * `ProductDetail.taglineLocalized`），v2 可无损扩展。
 *
 * spec §10.3 规则 2：EN 切换的颜色由 ref 的 `#6A80A0`（对 --navy-deep 仅
 * 4.29:1）改为 `--utility-muted` `#8AA0BE`（实测 6.46:1）。不要指望「禁用态
 * 豁免」—— WCAG 的豁免针对原生 `disabled` 表单控件，`aria-disabled` 的链接
 * 仍在可访问性树中，axe 会照常判定。
 */

import Link from 'next/link';

import type { LinkItem } from '@/types/content';

interface Props {
  left: LinkItem[];
  right: LinkItem[];
}

export function UtilityBar({ left, right }: Props) {
  return (
    <div className="utility-bar">
      <div className="container utility-inner">
        <div className="utility-left">
          {left.map((item, index) => (
            <span key={item.href} style={{ display: 'contents' }}>
              {index > 0 ? (
                <span className="sep" aria-hidden="true">
                  |
                </span>
              ) : null}
              {item.external ? (
                <a href={item.href}>{item.label}</a>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
            </span>
          ))}
        </div>
        <div className="utility-right">
          {right.map((item) => (
            <span key={item.href} style={{ display: 'contents' }}>
              {item.external ? (
                <a href={item.href}>{item.label}</a>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
              <span className="sep" aria-hidden="true">
                |
              </span>
            </span>
          ))}
          <span>
            <span className="lang" aria-current="true">
              中文
            </span>
            {' / '}
            <span className="lang-en" aria-disabled="true" title="英文站建设中">
              EN
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
