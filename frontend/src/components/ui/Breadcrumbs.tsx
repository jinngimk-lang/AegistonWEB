import Link from 'next/link';

import styles from '@/components/ui/Breadcrumbs.module.css';
import { NON_ROUTE_SEGMENTS, ROUTES, SEGMENT_LABELS } from '@/lib/routes';

export interface Crumb {
  label: string;
  href: string;
  /** false 表示该段没有对应页面，渲染为纯文本（见 NON_ROUTE_SEGMENTS）。 */
  navigable?: boolean;
}

/** 从路径推导面包屑；`overrides` 用于详情页覆盖最后一段的标签。 */
export function crumbsFromPath(pathname: string, lastLabel?: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: '首页', href: ROUTES.home }];
  let acc = '';
  segments.forEach((segment, index) => {
    acc += `/${segment}`;
    const isLast = index === segments.length - 1;
    crumbs.push({
      label: isLast && lastLabel ? lastLabel : (SEGMENT_LABELS[segment] ?? segment),
      href: acc,
      navigable: !NON_ROUTE_SEGMENTS.has(segment),
    });
  });
  return crumbs;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <div className="breadcrumb-bar">
      <div className="container">
        <nav className={styles.crumbs} aria-label="面包屑">
          {items.map((crumb, index) => {
            const isLast = index === items.length - 1;
            const isPlain = isLast || crumb.navigable === false;
            return (
              <span key={crumb.href} className={styles.crumb}>
                {index > 0 ? (
                  <span className={styles.divider} aria-hidden="true">
                    /
                  </span>
                ) : null}
                {isPlain ? (
                  <span
                    className={isLast ? styles.current : undefined}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className={styles.link}>
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
