'use client';

/**
 * 顶栏检索入口 + 全局快捷键 + 面板懒加载（v3 spec §4.2.4 / §4.6.1 M5-b）。
 *
 * 关于 ref 偏离（CLAUDE.md §11）：`ref/1.html:436` 本来就有
 * `<button class="nav-search" aria-label="搜索">`，v2 因为当时没有检索页可指，
 * 把它实现成了 `<Link href="/sitemap">`。v3 做的是**把 ref 原本的 `<button>`
 * 还原**，这是消除一处临时替代，不是新增偏离。
 * 真正新增的两条偏离已登记进 v2 spec §5.3 第 8 / 9 条：
 *   8. 命中区由 ref 的 40×40 放大到 44×44（视觉圆形直径仍是 40px，靠 padding 扩）
 *   9. 桌面宽屏在按钮右侧显示 `⌘K` / `Ctrl K` 提示徽标
 *
 * `/` 键**仅当焦点不在 input/textarea/contenteditable 且无修饰键时**触发 ——
 * 否则用户在联系表单里打一个斜杠就会被弹出面板。
 *
 * ⚠️ **面板只有这一个实例，且必须挂在顶栏**，不能在移动端抽屉里再放一个：
 * 抽屉关闭时会给自己加 `inert`，而 `inert` 对后代**一律生效** —— 挂在抽屉里的
 * `<dialog>` 即使 `showModal()` 进了 top layer 也会被惰性化，表现为「面板看着
 * 打开了，但点不动、也读不到」。这是实测踩到的，不是推测。移动端抽屉里的
 * 入口只负责回调，面板由本组件统一持有。
 *
 * 面板本体走 `next/dynamic({ ssr: false })`：实测在每条路由上省 2.8 kB gzip JS
 * + 1.8 kB CSS（A/B 两次构建的数字见 bundle-budget.json 的基线记录）。
 * `ssr: false` 要求调用点位于客户端边界之内 —— 本文件首行就是 `'use client'`。
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { LinkItem } from '@/types/content';

const SearchDialog = dynamic(() => import('@/components/search/SearchDialog'), { ssr: false });

interface Props {
  quickLinks: LinkItem[];
  contentHash: string;
  /** 受控开关：移动端抽屉里的入口也通过它打开同一个面板。 */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null
  );
}

export function SearchTrigger({ quickLinks, contentHash, open, onOpenChange }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setMounted(true);
    // userAgent 嗅探只用于**显示哪个修饰键提示**，快捷键本身两个都监听
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  const openPanel = useCallback(() => onOpenChange(true), [onOpenChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openPanel();
        return;
      }
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        openPanel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPanel]);

  const close = useCallback(() => {
    onOpenChange(false);
    // 面板卸载后把焦点还给触发按钮。原生 <dialog> 的 close() 本来会做这件事，
    // 但我们把面板整个卸载了（懒加载的代价），所以得自己还一次。
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, [onOpenChange]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="nav-search"
        aria-label="搜索"
        title="站内检索（⌘K / Ctrl K）"
        aria-keyshortcuts="Meta+K Control+K"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openPanel}
      >
        <SearchIcon />
        <span className="nav-search-hint" aria-hidden="true">
          {mounted && isMac ? '⌘K' : 'Ctrl K'}
        </span>
      </button>

      {/* 面板本体只在第一次打开后才把 chunk 拉下来 */}
      {open ? (
        <SearchDialog
          quickLinks={quickLinks}
          contentHash={contentHash}
          open={open}
          onClose={close}
        />
      ) : null}
    </>
  );
}

export function SearchIcon() {
  return (
    <svg
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
