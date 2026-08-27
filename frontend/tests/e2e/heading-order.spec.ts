import { expect, test } from '@playwright/test';

const LIGHTHOUSE_PAGES = [
  '/',
  '/products',
  '/products/aragonteam',
  '/solutions/telecom',
  '/research',
  '/contact',
];

test.describe('heading outline', () => {
  for (const path of LIGHTHOUSE_PAGES) {
    test(`${path} 不跳过可访问标题层级`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      const headings = await page
        .locator('h1, h2, h3, h4, h5, h6, [role="heading"]')
        .evaluateAll((elements) =>
          elements.flatMap((element) => {
            const html = element as HTMLElement;
            const role = html.getAttribute('role');
            if (role === 'presentation' || role === 'none' || html.getAttribute('aria-hidden') === 'true') {
              return [];
            }

            const style = getComputedStyle(html);
            if (style.display === 'none' || style.visibility === 'hidden') return [];

            const ariaLevel = html.getAttribute('aria-level');
            const nativeLevel = /^H[1-6]$/.test(html.tagName) ? Number(html.tagName.slice(1)) : NaN;
            const level = ariaLevel ? Number(ariaLevel) : nativeLevel;
            if (!Number.isFinite(level)) return [];

            return [
              {
                level,
                text: (html.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
              },
            ];
          }),
        );

      const skips = headings.flatMap((heading, index) => {
        if (index === 0) return [];
        const previous = headings[index - 1];
        return heading.level > previous.level + 1
          ? [`${previous.level}:${previous.text} -> ${heading.level}:${heading.text}`]
          : [];
      });

      expect(skips, `${path} 存在 heading-order 跳级`).toEqual([]);
    });
  }
});
