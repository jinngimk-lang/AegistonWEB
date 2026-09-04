/**
 * 页脚（ref `.footer`）。
 *
 * 备案信息复用 `footerLegal` 的 LinkItem：站内法务链接保持在左侧，
 * `external: true` 的备案链接独立放在底栏中部，避免与版权信息挤在一起。
 */

import Image from 'next/image';
import Link from 'next/link';

import { ROUTES } from '@/lib/routes';
import type { Navigation, SiteSettings } from '@/types/content';

interface Props {
  navigation: Navigation;
  settings: SiteSettings;
}

export function SiteFooter({ navigation, settings }: Props) {
  const footerLegal = navigation.footerLegal.filter((item) => !item.external);
  const footerFilings = navigation.footerLegal.filter((item) => item.external);

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
              {/* ref 依赖 h5 选择器做视觉排版；nav 自身已有 aria-label，因此这里不是文档标题。 */}
              <h5 role="presentation">{column.label}</h5>
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
            {footerLegal.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          {footerFilings.length > 0 ? (
            <nav
              className="footer-filing footer-bottom-links"
              aria-label="网站备案信息"
              style={{ flexWrap: 'wrap', justifyContent: 'center', minWidth: 0 }}
            >
              {footerFilings.map((item) => {
                const isPublicSecurityFiling = item.href.startsWith('https://beian.mps.gov.cn/');

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    style={
                      isPublicSecurityFiling
                        ? { display: 'inline-flex', alignItems: 'center', gap: 6 }
                        : undefined
                    }
                  >
                    {isPublicSecurityFiling ? (
                      <Image
                        src="/media/beian-police.png"
                        alt=""
                        width={18}
                        height={20}
                        aria-hidden="true"
                      />
                    ) : null}
                    {item.label}
                  </a>
                );
              })}
            </nav>
          ) : null}

          <div>
            <span>
              © {settings.copyrightYear} {settings.legalName}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
