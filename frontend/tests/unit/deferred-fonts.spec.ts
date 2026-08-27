// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { makeDeferredFontsOptional } from '@/components/layout/DeferredFontStyles';

describe('deferred font display strategy', () => {
  it('只把非关键字体的 swap 改成 optional', () => {
    const css = `
@font-face {
  font-family: 'Noto Sans SC';
  font-display: swap;
  src: url(/fonts/a.woff2) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-display: swap ;
  src: url(/fonts/b.woff2) format('woff2');
}
@font-face {
  font-family: 'Already Optional';
  font-display: optional;
  src: url(/fonts/c.woff2) format('woff2');
}
`;

    const result = makeDeferredFontsOptional(css);

    expect(result).not.toMatch(/font-display:\s*swap/);
    expect(result.match(/font-display:\s*optional/g)).toHaveLength(3);
    expect(result).toContain("font-family: 'Noto Sans SC'");
    expect(result).toContain('url(/fonts/a.woff2)');
  });
});
