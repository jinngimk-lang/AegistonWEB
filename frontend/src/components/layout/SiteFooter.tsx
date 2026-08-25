/**
 * 页脚（ref `.footer`）。
 *
 * spec R9：`icp` 为空时**不渲染该行**——上线前由客户填入，
 * 不在页面上留一个 `陕 ICP 备 2026XXXXXX 号` 这样的占位符。
 */

import Link from 'next/link';

import { ROUTES } from '@/lib/routes';
import type { Navigation, SiteSettings } from '@/types/content';

interface Props {
  navigation: Navigation;
  settings: SiteSettings;
}

export function SiteFooter({ navigation, settings }: Props) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link href={ROUTES.home} className="brand" aria-label={`${settings.nameCn} 首页`}>
              <div className="brand-text">
                <span className="cn">{settings.nameCn}</span>
                <span className="en">{settings.nameEn}</span>
              </div>
            </Link>
            <p>{settings.description}</p>
          </div>

          {navigation.footerColumns.map((column) => (
            <nav key={column.label} className="footer-col" aria-label={column.label}>
              <h5>{column.label}</h5>
              <ul>
                {column.items.map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a href={item.href}>{item.label}</a>
                    ) : (
                      <Link href={item.href}>{item.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <nav className="footer-bottom-links" aria-label="法务与站点信息">
            {navigation.footerLegal.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div>
            <span>
              © {settings.copyrightYear} {settings.legalName}
            </span>
            {settings.icp ? (
              <>
                <span className="divider" aria-hidden="true">
                  |
                </span>
                <span className="icp">{settings.icp}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
