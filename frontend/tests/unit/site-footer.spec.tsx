import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SiteFooter } from '@/components/layout/SiteFooter';
import type { Navigation, SiteSettings } from '@/types/content';

const navigation: Navigation = {
  utilityLeft: [],
  utilityRight: [],
  main: [],
  cta: { label: '联系我们', href: '/contact' },
  footerColumns: [],
  footerLegal: [{ label: '使用条款', href: '/legal/terms' }],
};

const settings: SiteSettings = {
  nameCn: '智瞳安宇',
  nameEn: 'Aegiston',
  legalName: '西安智瞳安宇科技有限公司',
  tagline: 'test',
  description: 'test',
  keywords: [],
  contact: {
    businessEmail: 'contact@aegiston.com',
    careersEmail: 'contact@aegiston.com',
  },
  icp: '陕ICP备2026023369号-1',
  publicSecurityRecord: '陕公网安备61019002004229号',
  copyrightYear: 2026,
  pendingConfirmation: [],
};

function parse(markup: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = markup;
  return host;
}

describe('SiteFooter filing records', () => {
  it('在底栏独立备案区渲染 ICP 与公安备案官方查询链接', () => {
    const dom = parse(renderToStaticMarkup(<SiteFooter navigation={navigation} settings={settings} />));
    const filing = dom.querySelector('.footer-filing');

    expect(filing).not.toBeNull();
    const links = Array.from(filing?.querySelectorAll('a') ?? []);
    expect(links.map((link) => link.textContent)).toEqual([
      '陕ICP备2026023369号-1',
      '陕公网安备61019002004229号',
    ]);
    expect(links[0]?.getAttribute('href')).toBe('https://beian.miit.gov.cn/');
    expect(links[1]?.getAttribute('href')).toBe('https://beian.mps.gov.cn/#/query/webSearch');
  });
});
