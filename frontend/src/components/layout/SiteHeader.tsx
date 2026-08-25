'use client';

/**
 * 主导航（spec §10.1 HCI 重点）。
 *
 * 桌面：`.nav-item` 上 `onMouseEnter/Leave` 控制展开；同时 `<button
 * aria-expanded aria-controls>` + `onKeyDown`（Enter/Space 展开，Esc 收起并回焦，
 * ↑↓ 在子项间移动，Tab 离开自动收起）。
 * 展开延迟：进入 0 ms、离开 160 ms（防止斜向移动误关闭），与 ref 的 `.22s`
 * 过渡协调。
 *
 * 当前路由高亮：`aria-current="page"`，视觉为 `color:var(--red)` + 底部 2px。
 *
 * 移动（<1024px）：ref 直接 `display:none` 隐藏主导航，移动端完全无法导航 ——
 * 这是 spec §5.3 登记在案的唯一结构性偏离，改为汉堡按钮 + 全屏抽屉。
 *
 * ⚠️ 本组件的类名全部来自全局层 `src/styles/sections.css`，不经 CSS Modules。
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { MobileNav } from '@/components/layout/MobileNav';
import { cn } from '@/lib/cn';
import type { Navigation } from '@/types/content';

const CLOSE_DELAY_MS = 160;

interface Props {
  navigation: Navigation;
  brandCn: string;
  brandEn: string;
}

export function SiteHeader({ navigation, brandCn, brandEn }: Props) {
  const pathname = usePathname();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idPrefix = useId();

  const clearTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openNow = useCallback(
    (index: number) => {
      clearTimer();
      setOpenIndex(index);
    },
    [clearTimer],
  );

  const closeSoon = useCallback(() => {
    clearTimer();
    closeTimer.current = setTimeout(() => setOpenIndex(null), CLOSE_DELAY_MS);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  // 路由变化时收起所有展开态
  useEffect(() => {
    setOpenIndex(null);
    setMobileOpen(false);
  }, [pathname]);

  const isCurrent = (href: string | null | undefined) => {
    if (!href) return false;
    const path = href.split('?')[0] ?? href;
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const groupIsCurrent = (index: number) => {
    const group = navigation.main[index];
    if (!group) return false;
    return isCurrent(group.href) || group.items.some((item) => isCurrent(item.href));
  };

  return (
    <nav className="nav" aria-label="主导航">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label={`${brandCn} 首页`}>
          <BrandMark />
          <div className="brand-text">
            <span className="cn">{brandCn}</span>
            <span className="en">{brandEn}</span>
          </div>
        </Link>

        <div className="nav-menu">
          {navigation.main.map((group, index) => {
            const submenuId = `${idPrefix}-submenu-${index}`;
            const hasItems = group.items.length > 0;
            const expanded = openIndex === index;

            if (!hasItems) {
              return (
                <div
                  key={group.label}
                  className="nav-item"
                  data-current={groupIsCurrent(index) || undefined}
                >
                  <Link
                    href={group.href ?? '/'}
                    className="nav-item-trigger"
                    aria-current={isCurrent(group.href) ? 'page' : undefined}
                  >
                    {group.label}
                  </Link>
                </div>
              );
            }

            return (
              <div
                key={group.label}
                className="nav-item"
                data-open={expanded || undefined}
                data-current={groupIsCurrent(index) || undefined}
                onMouseEnter={() => openNow(index)}
                onMouseLeave={closeSoon}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setOpenIndex(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && expanded) {
                    event.preventDefault();
                    setOpenIndex(null);
                    const trigger = event.currentTarget.querySelector<HTMLElement>(
                      '[data-nav-trigger]',
                    );
                    trigger?.focus();
                  }
                }}
              >
                <button
                  type="button"
                  className="nav-item-trigger"
                  data-nav-trigger
                  aria-expanded={expanded}
                  aria-controls={submenuId}
                  onClick={() => setOpenIndex(expanded ? null : index)}
                  onKeyDown={(event) => {
                    if (event.key === ' ' || event.key === 'Spacebar') {
                      event.preventDefault();
                      setOpenIndex(expanded ? null : index);
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      openNow(index);
                      const first = event.currentTarget.parentElement?.querySelector<HTMLElement>(
                        '.submenu a',
                      );
                      requestAnimationFrame(() => first?.focus());
                    }
                  }}
                >
                  {group.label}
                  <span className="caret" aria-hidden="true" />
                </button>

                <div className="submenu" id={submenuId} role="group" aria-label={group.label}>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isCurrent(item.href) ? 'page' : undefined}
                      onKeyDown={(event) => handleSubmenuKeys(event)}
                    >
                      <span>{item.label}</span>
                      {item.note ? <span className="ext">{item.note}</span> : null}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="nav-actions">
          <Link
            href="/sitemap"
            className="nav-search"
            aria-label="站点地图与检索"
            title="站点地图与检索"
          >
            <SearchIcon />
          </Link>
          <Link
            href={navigation.cta.href}
            className={cn('nav-contact')}
            aria-current={isCurrent(navigation.cta.href) ? 'page' : undefined}
          >
            {navigation.cta.label}
          </Link>
          <button
            type="button"
            className="nav-menu-toggle"
            aria-label={mobileOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={mobileOpen}
            aria-controls={`${idPrefix}-mobile-nav`}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <BurgerIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      <MobileNav
        id={`${idPrefix}-mobile-nav`}
        navigation={navigation}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isCurrent={isCurrent}
      />
    </nav>
  );
}

function handleSubmenuKeys(event: React.KeyboardEvent<HTMLAnchorElement>) {
  const links = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('a') ?? [],
  );
  const index = links.indexOf(event.currentTarget);
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    links[Math.min(index + 1, links.length - 1)]?.focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (index === 0) {
      const trigger =
        event.currentTarget.parentElement?.parentElement?.querySelector<HTMLElement>(
          '[data-nav-trigger]',
        );
      trigger?.focus();
    } else {
      links[index - 1]?.focus();
    }
  }
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--red)' }}>
        <path d="M26 6 L44 14 L44 30 C44 39 36 45 26 47 C16 45 8 39 8 30 L8 14 Z" />
        <path d="M17 26 L23 32 L35 20" />
      </svg>
    </span>
  );
}

function SearchIcon() {
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

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {open ? (
        <path d="M5 5 L19 19 M19 5 L5 19" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}
