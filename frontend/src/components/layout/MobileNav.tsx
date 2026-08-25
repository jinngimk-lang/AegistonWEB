'use client';

/**
 * 移动端全屏导航抽屉（<1024px）。
 *
 * spec §10.1：二级用 `<details>` 语义折叠；打开时 `body` 锁滚动 + focus trap
 * + `Esc` 关闭。这是 ref 的 HCI 缺陷修复项（§5.3 第 1 行）。
 */

import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';

import styles from '@/components/layout/MobileNav.module.css';
import { SearchIcon } from '@/components/search/SearchTrigger';
import { cn } from '@/lib/cn';
import type { Navigation } from '@/types/content';

interface Props {
  id: string;
  navigation: Navigation;
  open: boolean;
  onClose: () => void;
  isCurrent: (href: string | null | undefined) => boolean;
  /** 打开命令面板。⚠️ 面板本体挂在顶栏而不是这里 —— 抽屉关闭时的 `inert`
   *  会把挂在它内部的 `<dialog>` 一起惰性化（见 SearchTrigger 抬头）。 */
  onSearch: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), summary, input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function MobileNav({
  id,
  navigation,
  open,
  onClose,
  isCurrent,
  onSearch,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    restoreFocus.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else {
        trapFocus(event);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const firstLink = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    requestAnimationFrame(() => firstLink?.focus());

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose, trapFocus]);

  return (
    <>
      <div
        className={cn(styles.overlay, open && styles.overlayOpen)}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        id={id}
        ref={panelRef}
        className={cn(styles.panel, open && styles.panelOpen)}
        role="dialog"
        aria-modal={open || undefined}
        aria-label="导航菜单"
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.head}>
          <span className={styles.title}>导航</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="关闭导航菜单">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M5 5 L19 19 M19 5 L5 19" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* 检索入口放在抽屉顶部：移动端没有 ⌘K，可见入口是唯一的发现路径
              （v3 spec §4.2.4）。点开面板时先收起抽屉，避免两层模态叠加。 */}
          <button type="button" className={styles.search} aria-label="搜索" onClick={onSearch}>
            <SearchIcon />
            <span>站内检索</span>
          </button>
          {navigation.main.map((group) =>
            group.items.length === 0 ? (
              <Link
                key={group.label}
                href={group.href ?? '/'}
                className={styles.link}
                aria-current={isCurrent(group.href) ? 'page' : undefined}
                onClick={onClose}
              >
                {group.label}
              </Link>
            ) : (
              <details key={group.label} className={styles.group}>
                <summary className={styles.groupSummary}>
                  <span>{group.label}</span>
                  <span className={styles.chevron} aria-hidden="true" />
                </summary>
                <div className={styles.items}>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={styles.subLink}
                      aria-current={isCurrent(item.href) ? 'page' : undefined}
                      onClick={onClose}
                    >
                      <span>{item.label}</span>
                      {item.note ? <span className={styles.itemNote}>{item.note}</span> : null}
                    </Link>
                  ))}
                </div>
              </details>
            ),
          )}
        </div>

        <div className={styles.foot}>
          <Link href={navigation.cta.href} className={styles.cta} onClick={onClose}>
            {navigation.cta.label}
            <span aria-hidden="true">→</span>
          </Link>
          <div className={styles.utility}>
            {[...navigation.utilityLeft, ...navigation.utilityRight].map((item) => (
              <Link key={item.href} href={item.href} onClick={onClose}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
