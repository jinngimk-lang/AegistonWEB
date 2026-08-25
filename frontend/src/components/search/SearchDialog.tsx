'use client';

/**
 * ⌘K 命令面板（v3 spec §4.2.4）。
 *
 * 容器用**原生 `<dialog>` + `showModal()`** —— 与 v2 的 `Lightbox` 同一套做法：
 * 浏览器原生提供焦点陷阱、`Esc` 关闭、`::backdrop` 与背景内容惰性化，
 * 比自研可靠得多，WebKit 支持面 v2 已经验证过。
 *
 * 几处不显眼但决定手感的地方：
 *
 * - **输入法**：监听 `compositionstart` / `compositionend`，组合期间不触发检索。
 *   否则中文输入每敲一个字母都会跑一次匹配，结果乱跳 —— 这是中文站命令面板
 *   最常见的缺陷。
 * - **索引未就绪**：面板照常打开、输入框照常可用，结果区显示骨架；
 *   索引到达后自动重跑当前查询。绝不因为一个 fetch 让输入框转圈。
 * - **索引 URL 带 `contentHash` 版本位**：`force-cache` 的语义是「命中即用，
 *   不管新鲜与否」。固定 URL + 内容更新 = 浏览器里躺着一份会指向**死链**的
 *   旧索引，而零死链是 CLAUDE.md §6 的零容忍项（v3 P0-4 / R17）。
 * - **Tab 关闭面板**：不在面板内做二级 Tab 序列，避免与 combobox 语义冲突。
 *
 * 类名前缀 `sd-`，自包含 → CSS Module（CLAUDE.md §1）。
 */

import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { SearchResults, flattenHits } from '@/components/search/SearchResults';
import {
  buildRuntimeIndex,
  countHits,
  search,
  type RuntimeIndex,
  type SearchGroup,
  type SearchIndex,
} from '@/lib/search';
import { ROUTES } from '@/lib/routes';
import type { LinkItem } from '@/types/content';

import styles from './SearchDialog.module.css';

const DEBOUNCE_MS = 120;

interface Props {
  quickLinks: LinkItem[];
  contentHash: string;
  open: boolean;
  onClose: () => void;
}

/** 模块级缓存：面板反复开关时不重复 fetch、不重复建倒排表。 */
let cachedRuntime: RuntimeIndex | null = null;
let inFlight: Promise<RuntimeIndex> | null = null;

async function loadRuntimeIndex(contentHash: string): Promise<RuntimeIndex> {
  if (cachedRuntime && cachedRuntime.contentHash === contentHash) return cachedRuntime;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    // 版本位一变就是一次新的缓存键 —— 这是 force-cache 唯一安全的用法
    const res = await fetch(`/search-index.json?v=${encodeURIComponent(contentHash)}`, {
      cache: 'force-cache',
    });
    if (!res.ok) throw new Error(`索引不可用：HTTP ${res.status}`);
    const index = (await res.json()) as SearchIndex;
    const runtime = buildRuntimeIndex(index);
    cachedRuntime = runtime;
    return runtime;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export default function SearchDialog({ quickLinks, contentHash, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  const [runtime, setRuntime] = useState<RuntimeIndex | null>(cachedRuntime);
  const [failed, setFailed] = useState(false);
  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const idPrefix = useId().replace(/:/g, '');
  const listboxId = `${idPrefix}-listbox`;
  const optionPrefix = `${idPrefix}-opt`;

  // --- 打开 / 关闭：交给原生 <dialog> ------------------------------------
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() 之后立刻抢一次焦点，再用 rAF 补一次：
      // Chromium 在把对话框提升到 top layer 的那一帧里会自己挑一个可聚焦元素，
      // 只写 rAF 有时会被它盖掉，只写同步调用在 WebKit 上偶尔又太早。
      // 两次都做是幂等的，代价是一次多余的 focus()。
      inputRef.current?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus({ preventScroll: true });
        }
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // --- 索引懒加载：只在面板首次打开时拉一次 ------------------------------
  useEffect(() => {
    if (!open || runtime) return;
    let cancelled = false;
    loadRuntimeIndex(contentHash)
      .then((value) => {
        if (!cancelled) setRuntime(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, runtime, contentHash]);

  // --- debounce：组合期间不推进 -----------------------------------------
  useEffect(() => {
    if (composingRef.current) return;
    const timer = setTimeout(() => setQuery(raw), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [raw]);

  const groups: SearchGroup[] = useMemo(() => {
    if (!runtime || !query.trim()) return [];
    return search(runtime, query);
  }, [runtime, query]);

  const flat = useMemo(() => flattenHits(groups), [groups]);
  const total = countHits(groups);

  useEffect(() => setActiveIndex(0), [query]);

  const close = useCallback(() => {
    setRaw('');
    setQuery('');
    onClose();
  }, [onClose]);

  /**
   * 打开一条结果。用原生跳转而不是 `router.push`：面板是模态，
   * 跳转后整页导航更可预期，也避免「面板还开着但路由已经变了」这种中间态。
   */
  const activate = useCallback((href: string) => {
    window.location.assign(href);
  }, []);

  const openActive = useCallback(() => {
    const target = flat[activeIndex];
    if (target) activate(target.hit.doc.href);
  }, [flat, activeIndex, activate]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (composingRef.current) return;
    const count = flat.length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count > 0) setActiveIndex((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count > 0) setActiveIndex((i) => (i - 1 + count) % count);
        break;
      case 'Home':
        if (count > 0) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (count > 0) {
          event.preventDefault();
          setActiveIndex(count - 1);
        }
        break;
      case 'Enter':
        if (count > 0) {
          event.preventDefault();
          openActive();
        }
        break;
      case 'Tab':
        event.preventDefault();
        close();
        break;
      default:
        break;
    }
  };

  const activeId = flat.length > 0 ? `${optionPrefix}-${activeIndex}` : undefined;
  const showQuickLinks = !query.trim();
  const loading = !runtime && !failed;
  /**
   * `role="listbox"` **只在真的在展示选项时才挂**。
   *
   * 与 SearchResults 抬头记的那两条是同一条 ARIA 硬约束：listbox 的子元素只能是
   * `option` / `group`。空查询态的容器里装的是快捷入口（`<nav>` + 一串链接）、
   * 无结果态里装的是三个出口按钮 —— 常挂 listbox 会让这些状态各自触发一次
   * `aria-required-children`（critical）。a11y 用例扫的是**填了查询词之后**的
   * 面板，扫不到这三态，所以这里靠结构本身守住，不靠用例（v3 B-7 的同源问题）。
   *
   * 容器元素本身始终存在，`aria-controls` 指向的 id 不会悬空；折叠态由
   * `aria-expanded={flat.length > 0}` 表达。
   */
  const showResults = !showQuickLinks && total > 0;

  return (
    <dialog
      ref={dialogRef}
      className={styles['sd-dialog']}
      aria-label="站内检索"
      onClose={close}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        // 点击 ::backdrop：事件目标就是 dialog 本身
        if (event.target === dialogRef.current) close();
      }}
    >
      <div className={styles['sd-panel']}>
        <div className={styles['sd-field']}>
          <SearchGlyph />
          <input
            ref={inputRef}
            type="text"
            className={styles['sd-input']}
            placeholder="检索产品、行业实践、技术模块与洞察…"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-label="站内检索输入框"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              setRaw(event.currentTarget.value);
            }}
          />
          <button type="button" className={styles['sd-close']} onClick={close} aria-label="关闭检索">
            Esc
          </button>
        </div>

        <div
          className={styles['sd-body']}
          id={listboxId}
          role={showResults ? 'listbox' : undefined}
          aria-label={showResults ? '检索结果' : undefined}
        >
          {loading ? <Skeleton /> : null}

          {failed ? (
            <p className={styles['sd-note']}>
              索引暂时不可用。你仍然可以打开
              <Link href={ROUTES.search} onClick={close}>
                {' '}
                站内检索页{' '}
              </Link>
              或
              <Link href={ROUTES.sitemap} onClick={close}>
                {' '}
                网站地图
              </Link>
              。
            </p>
          ) : null}

          {!loading && !failed && showQuickLinks ? (
            <nav className={styles['sd-quick']} aria-label="快捷入口">
              <h3 className={styles['sd-quick-label']}>快捷入口</h3>
              <ul>
                {quickLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={close}>
                      {item.label}
                      {item.note ? <span className={styles['sd-quick-note']}>{item.note}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {!loading && !failed && !showQuickLinks && total === 0 ? (
            <div className={styles['sd-empty']}>
              <p>没有匹配到内容。</p>
              <div className={styles['sd-exits']}>
                <Link href={ROUTES.sitemap} onClick={close}>
                  浏览网站地图
                </Link>
                <Link href={ROUTES.contact} onClick={close}>
                  直接联系我们
                </Link>
                <button type="button" onClick={() => setRaw('')}>
                  清空重试
                </button>
              </div>
            </div>
          ) : null}

          {showResults ? (
            <SearchResults
              groups={groups}
              query={query}
              variant="dialog"
              activeId={activeId}
              idPrefix={optionPrefix}
              onHover={setActiveIndex}
              onActivate={activate}
            />
          ) : null}
        </div>

        <p className={styles['sd-live']} aria-live="polite" role="status">
          {showQuickLinks || loading ? '' : `找到 ${total} 条结果`}
        </p>

        <div className={styles['sd-foot']}>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 选择
          </span>
          <span>
            <kbd>Enter</kbd> 打开
          </span>
          <span>
            <kbd>Esc</kbd> 关闭
          </span>
          <Link href={ROUTES.search} onClick={close} className={styles['sd-all']}>
            打开检索页
          </Link>
        </div>
      </div>
    </dialog>
  );
}

function Skeleton() {
  return (
    <div className={styles['sd-skeleton']} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg
      className={styles['sd-glyph']}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
