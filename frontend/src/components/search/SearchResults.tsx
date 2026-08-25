/**
 * 检索结果渲染 —— `/search` 页与 ⌘K 面板**共用同一个组件**，
 * 保证两处的视觉、分组与排序完全一致（v3 spec §4.2.5）。
 *
 * ⚠️ 本文件会被 `SearchDialog`（`'use client'`）导入，因而**同时进入客户端图**。
 * 所以这里（及其任何传递依赖）**禁止**引入 `server-only` / `@/lib/api`，
 * 否则构建期直接报错（v3 P2-6）。当前依赖只有 `@/lib/search`（纯函数）、
 * `next/link` 与本目录下的 `Highlight`。
 *
 * ## 两个 variant 的**标记结构不同**，这是有原因的
 *
 * `page` 变体是一串普通链接：`<ul><li><a href>`。
 *
 * `dialog` 变体是一个 combobox 的 listbox，它有两条 ARIA 硬约束（axe 实测，
 * 不是理论）：
 *
 * 1. **`role="listbox"` 的子元素只能是 `option` 或 `group`。** 把分组标题
 *    （`<h3>`）直接摆进去会触发 `aria-required-children`（critical）。
 *    所以每一组包一层 `role="group" aria-label="…"`，标题本身
 *    `aria-hidden`，组名由 `aria-label` 承担。
 * 2. **`role="option"` 里不能再放可聚焦的交互元素。** 里面套 `<a href>` 会触发
 *    `nested-interactive`（serious）—— 而且这在真实屏幕阅读器上也确实是错的：
 *    combobox 的选项由 `aria-activedescendant` 管理焦点，选项本身不该可 Tab。
 *    所以 dialog 变体的选项**不是链接**，点击与 Enter 都走 `onActivate`。
 *
 * 类名前缀 `sr-`，与 ref 的 `.section` / `.card` / `.item` 无任何后代关系
 * → 按 CLAUDE.md §1 归 CSS Module。
 */

import Link from 'next/link';

import { Highlight } from '@/components/search/Highlight';
import type { SearchGroup, SearchHit } from '@/lib/search';

import styles from './SearchResults.module.css';

interface Props {
  groups: SearchGroup[];
  query: string;
  variant: 'page' | 'dialog';
  /** dialog 变体下的 `aria-activedescendant` 目标 id。 */
  activeId?: string;
  /** dialog 变体下 option 的 id 前缀，与 combobox 的 `aria-controls` 对应。 */
  idPrefix?: string;
  onHover?: (index: number) => void;
  /** dialog 变体下点击选项时调用（选项不是链接，见抬头）。 */
  onActivate?: (href: string) => void;
}

/** 把 (组序号, 组内序号) 拍平成全局序号，供键盘遍历使用。 */
export function flattenHits(groups: SearchGroup[]) {
  return groups.flatMap((group) => group.hits.map((hit) => ({ group: group.type, hit })));
}

function collectTokens(groups: SearchGroup[]): string[] {
  const all = new Set<string>();
  for (const group of groups) {
    for (const hit of group.hits) {
      for (const token of hit.matchedTokens) all.add(token);
    }
  }
  return Array.from(all);
}

function HitBody({ hit, tokens }: { hit: SearchHit; tokens: string[] }) {
  const { doc } = hit;
  return (
    <>
      <span className={styles['sr-title']}>
        <Highlight text={doc.title} tokens={tokens} />
      </span>
      {doc.subtitle ? <span className={styles['sr-subtitle']}>{doc.subtitle}</span> : null}
      <span className={styles['sr-excerpt']}>
        <Highlight text={doc.excerpt} tokens={tokens} />
      </span>
      <span className={styles['sr-path']}>{doc.href}</span>
    </>
  );
}

export function SearchResults({
  groups,
  query,
  variant,
  activeId,
  idPrefix = 'sd-opt',
  onHover,
  onActivate,
}: Props) {
  const tokens = collectTokens(groups);
  let optionIndex = -1;

  if (variant === 'dialog') {
    return (
      <div className={styles['sr-root']} data-variant="dialog">
        {groups.map((group) => (
          <div key={group.type} role="group" aria-label={group.label} className={styles['sr-group']}>
            <p className={styles['sr-group-label']} aria-hidden="true">
              {group.label}
            </p>
            {group.hits.map((hit) => {
              optionIndex += 1;
              const index = optionIndex;
              const optionId = `${idPrefix}-${index}`;
              const active = activeId === optionId;
              return (
                <div
                  key={hit.doc.id}
                  id={optionId}
                  role="option"
                  aria-selected={active}
                  className={styles['sr-option']}
                  data-active={active || undefined}
                  onMouseEnter={onHover ? () => onHover(index) : undefined}
                  onClick={onActivate ? () => onActivate(hit.doc.href) : undefined}
                >
                  <HitBody hit={hit} tokens={tokens} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles['sr-root']} data-variant="page">
      {groups.map((group) => (
        <section key={group.type} className={styles['sr-group']} aria-label={group.label}>
          <h2 className={styles['sr-group-label']}>{group.label}</h2>
          <ul className={styles['sr-list']}>
            {group.hits.map((hit) => (
              <li key={hit.doc.id} className={styles['sr-item']}>
                <Link href={hit.doc.href} className={styles['sr-link']}>
                  <HitBody hit={hit} tokens={tokens} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && query ? <p className={styles['sr-empty-hint']} /> : null}
    </div>
  );
}
