import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SiteFooter } from '@/components/layout/SiteFooter';
import type { Navigation, SiteSettings } from '@/types/content';

const navigation: Navigation = {
  utilityLeft: [],
  utilityRight: [],
  main: [],
  cta: { label: '联系我们', href: '/contact' },
  footerColumns: [
    {
      label: '关于我们',
      items: [
        { label: '公司简介', href: '/about' },
        { label: '研发团队', href: '/about/team' },
        { label: '科研实力', href: '/about/strength' },
        { label: '加入我们', href: '/careers' },
      ],
    },
    {
      label: '行业与研究',
      items: [
        { label: '行业实践', href: '/solutions' },
        { label: '交通基建', href: '/solutions/transportation' },
        { label: '核心技术', href: '/research' },
      ],
    },
  ],
  footerLegal: [
    { label: '使用条款', href: '/legal/terms' },
    {
      label: '陕ICP备2026023369号-1',
      href: 'https://beian.miit.gov.cn/',
      external: true,
    },
    {
      label: '陕公网安备61019002004229号',
      href: 'https://beian.mps.gov.cn/#/query/webSearch?code=61019002004229',
      external: true,
    },
  ],
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
    expect(links[1]?.getAttribute('href')).toBe(
      'https://beian.mps.gov.cn/#/query/webSearch?code=61019002004229',
    );
    expect(links[1]?.getAttribute('target')).toBe('_blank');
    expect(links[1]?.getAttribute('rel')).toBe('noreferrer');

    const badge = links[1]?.querySelector('img');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute('src')).toContain('beian-police.png');
    expect(badge?.getAttribute('alt')).toBe('');
    expect(badge?.getAttribute('width')).toBe('18');
    expect(badge?.getAttribute('height')).toBe('20');
  });

  it('备案链接不会混入左侧站内法务链接', () => {
    const dom = parse(renderToStaticMarkup(<SiteFooter navigation={navigation} settings={settings} />));
    const legal = dom.querySelector('.footer-bottom-links');
    expect(legal?.textContent).toBe('使用条款');
  });

  it('全站页脚隐藏核心技术入口，同时保留行业与研究栏目中的其它链接', () => {
    const dom = parse(renderToStaticMarkup(<SiteFooter navigation={navigation} settings={settings} />));
    const industryColumn = dom.querySelector('nav[aria-label="行业与研究"]');

    expect(industryColumn).not.toBeNull();
    expect(industryColumn?.textContent).toContain('行业实践');
    expect(industryColumn?.textContent).toContain('交通基建');
    expect(industryColumn?.textContent).not.toContain('核心技术');
    expect(industryColumn?.querySelector('a[href="/research"]')).toBeNull();
  });

  it('全站页脚隐藏科研实力入口，同时保留关于我们栏目中的其它链接', () => {
    const dom = parse(renderToStaticMarkup(<SiteFooter navigation={navigation} settings={settings} />));
    const aboutColumn = dom.querySelector('nav[aria-label="关于我们"]');

    expect(aboutColumn).not.toBeNull();
    expect(aboutColumn?.textContent).toContain('公司简介');
    expect(aboutColumn?.textContent).toContain('研发团队');
    expect(aboutColumn?.textContent).toContain('加入我们');
    expect(aboutColumn?.textContent).not.toContain('科研实力');
    expect(aboutColumn?.querySelector('a[href="/about/strength"]')).toBeNull();
  });

  it('公司简介正文使用两个汉字宽度的首行缩进，不改正文内容', () => {
    const dom = parse(renderToStaticMarkup(<SiteFooter navigation={navigation} settings={settings} />));
    const description = dom.querySelector('.footer-brand > p') as HTMLParagraphElement | null;

    expect(description).not.toBeNull();
    expect(description?.style.textIndent).toBe('2em');
    expect(description?.textContent).toBe(
      '西安智瞳安宇科技有限公司定位于「AI+」企业智能化赋能与安全保障专家，以组织级、通用级、行业级三层产品构成企业智能底座，为客户提供AI人机协同超级团队平台、安全通用智能体与行业垂直智能体的完整能力。',
    );
  });
});
